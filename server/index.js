import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3020;

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const pool = new Pool({ connectionString: databaseUrl });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const schemaSQL = `
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  public_slug text null unique,
  schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  response jsonb not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_forms_user on forms(user_id, updated_at desc);
create index if not exists idx_responses_form on form_responses(form_id, submitted_at desc);
`;

async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(schemaSQL);
  } finally {
    client.release();
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function getUserId(deviceKey) {
  if (!deviceKey) throw new Error("Missing X-Device-Key header");
  const client = await pool.connect();
  try {
    const existing = await client.query(
      "select id from users where device_key = $1",
      [deviceKey]
    );
    if (existing.rows.length) return existing.rows[0].id;
    const created = await client.query(
      "insert into users (device_key) values ($1) returning id",
      [deviceKey]
    );
    return created.rows[0].id;
  } finally {
    client.release();
  }
}

function countFields(schema) {
  if (!schema?.sections) return 0;
  return schema.sections.reduce(
    (acc, section) => acc + (section.fields ? section.fields.length : 0),
    0
  );
}

function validateSchema(schema) {
  if (!schema?.sections) throw new Error("Schema must include sections");
  const total = countFields(schema);
  if (total > 200) throw new Error("Max 200 fields per form");
}

const submitGuard = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const history = submitGuard.get(ip) || [];
  const filtered = history.filter((ts) => now - ts < 60_000);
  if (filtered.length >= 5) return false;
  filtered.push(now);
  submitGuard.set(ip, filtered);
  return true;
}

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api/forms") && !req.path.startsWith("/api/responses")) {
    return next();
  }
  try {
    await ensureSchema();
    const deviceKey = req.header("x-device-key");
    req.userId = await getUserId(deviceKey);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/forms", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, status, public_slug, schema, updated_at from forms where user_id = $1 order by updated_at desc",
      [req.userId]
    );
    res.json({ forms: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/forms", async (req, res) => {
  const { name, schema } = req.body;
  if (!name || !schema) return res.status(400).json({ error: "name and schema required" });
  try {
    validateSchema(schema);
    const client = await pool.connect();
    const result = await client.query(
      `
      insert into forms (user_id, name, schema)
      values ($1, $2, $3)
      returning id, name, status, public_slug, schema
      `,
      [req.userId, name, schema]
    );
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/forms/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, status, public_slug, schema from forms where id = $1 and user_id = $2",
      [req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.patch("/api/forms/:id", async (req, res) => {
  const { name, schema, status } = req.body;
  try {
    if (schema) validateSchema(schema);
    const client = await pool.connect();
    const result = await client.query(
      `
      update forms
      set name = coalesce($1, name),
          schema = coalesce($2, schema),
          status = coalesce($3, status),
          updated_at = now()
      where id = $4 and user_id = $5
      returning id, name, status, public_slug, schema
      `,
      [name ?? null, schema ?? null, status ?? null, req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/forms/:id/publish", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select name from forms where id = $1 and user_id = $2",
      [req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const slug = `${slugify(result.rows[0].name)}-${Math.random().toString(36).slice(2, 7)}`;
    const updated = await client.query(
      "update forms set status = 'published', public_slug = $1 where id = $2 returning public_slug",
      [slug, req.params.id]
    );
    res.json({ public_slug: updated.rows[0].public_slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/forms/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(
      "delete from forms where id = $1 and user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/forms/:id/responses", async (req, res) => {
  const limit = Number(req.query.limit || 100);
  const cursor = req.query.cursor;
  const client = await pool.connect();
  try {
    const params = [req.params.id];
    let where = "form_id = $1";
    if (cursor) {
      params.push(cursor);
      where += " and submitted_at < $2";
    }
    const result = await client.query(
      `select id, submitted_at, response from form_responses where ${where} order by submitted_at desc limit ${limit}`,
      params
    );
    if (req.query.format === "csv") {
      const rows = result.rows;
      const keys = new Set();
      rows.forEach((row) => Object.keys(row.response || {}).forEach((k) => keys.add(k)));
      const header = ["id", "submitted_at", ...Array.from(keys)];
      const csv = [header.join(",")];
      rows.forEach((row) => {
        const line = [row.id, row.submitted_at.toISOString()];
        header.slice(2).forEach((key) => {
          line.push(JSON.stringify(row.response?.[key] ?? ""));
        });
        csv.push(line.join(","));
      });
      res.setHeader("Content-Type", "text/csv");
      res.send(csv.join("\n"));
      return;
    }
    const nextCursor = result.rows.length ? result.rows[result.rows.length - 1].submitted_at : null;
    res.json({ responses: result.rows, nextCursor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/responses/:responseId", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("delete from form_responses where id = $1", [req.params.responseId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/public/forms/:publicSlug", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, schema from forms where public_slug = $1",
      [req.params.publicSlug]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/public/forms/:publicSlug/submit", async (req, res) => {
  if (!checkRateLimit(req.ip)) {
    return res.status(429).json({ error: "Too many submissions" });
  }
  const response = req.body.response;
  if (!response) return res.status(400).json({ error: "Response required" });
  const payloadSize = JSON.stringify(response).length;
  if (payloadSize > 32 * 1024) return res.status(400).json({ error: "Response too large" });
  const client = await pool.connect();
  try {
    const form = await client.query(
      "select id from forms where public_slug = $1",
      [req.params.publicSlug]
    );
    if (!form.rows.length) return res.status(404).json({ error: "Form not found" });
    await client.query(
      "insert into form_responses (form_id, response, meta) values ($1, $2, $3)",
      [form.rows[0].id, response, { ip: req.ip, ua: req.get("user-agent") }]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  app.listen(port, () => {
    console.log(`FormFoundry running on http://127.0.0.1:${port}`);
  });
}

export default app;
