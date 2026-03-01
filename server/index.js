import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3019;

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set.");
}

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

create table if not exists datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  slug text not null,
  schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

create table if not exists dataset_rows (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  row_key text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(dataset_id, row_key)
);

create index if not exists idx_rows_dataset on dataset_rows(dataset_id);
create index if not exists idx_rows_dataset_time on dataset_rows(dataset_id, updated_at desc);
`;

async function ensureSchema() {
  if (!databaseUrl) return;
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

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api/gridsmith")) return next();
  try {
    await ensureSchema();
    const deviceKey = req.header("x-device-key");
    req.userId = await getUserId(deviceKey);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/gridsmith/datasets", async (req, res) => {
  const client = await pool.connect();
  try {
    const rows = await client.query(
      "select id, name, slug, schema, created_at, updated_at from datasets where user_id = $1 order by updated_at desc",
      [req.userId]
    );
    res.json({ datasets: rows.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/gridsmith/datasets", async (req, res) => {
  const { name, slug, schema } = req.body;
  if (!name || !schema) {
    return res.status(400).json({ error: "name and schema are required" });
  }
  const finalSlug = slug ? slugify(slug) : slugify(name);
  const client = await pool.connect();
  try {
    const result = await client.query(
      """
      insert into datasets (user_id, name, slug, schema)
      values ($1, $2, $3, $4)
      returning id, name, slug, schema, created_at, updated_at
      """,
      [req.userId, name, finalSlug, schema]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/gridsmith/datasets/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, slug, schema from datasets where id = $1 and user_id = $2",
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

app.patch("/api/gridsmith/datasets/:id", async (req, res) => {
  const { name, schema } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      """
      update datasets
      set name = coalesce($1, name),
          schema = coalesce($2, schema),
          updated_at = now()
      where id = $3 and user_id = $4
      returning id, name, slug, schema, updated_at
      """,
      [name ?? null, schema ?? null, req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/gridsmith/datasets/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(
      "delete from datasets where id = $1 and user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/gridsmith/datasets/:id/rows", async (req, res) => {
  const { page = "1", pageSize = "25", sortKey, sortDir, filters } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  const params = [req.params.id];
  const whereClauses = ["dataset_id = $1"];
  let paramIndex = 2;

  if (filters) {
    try {
      const parsed = JSON.parse(filters);
      for (const filter of parsed) {
        if (!filter.key) continue;
        if (filter.op === "contains") {
          params.push(filter.key);
          params.push(`%${filter.value}%`);
          whereClauses.push(`data->>$${paramIndex} ILIKE $${paramIndex + 1}`);
          paramIndex += 2;
        } else if (filter.op === "in") {
          params.push(filter.key);
          params.push(filter.value);
          whereClauses.push(`data->>$${paramIndex} = any($${paramIndex + 1})`);
          paramIndex += 2;
        } else if (filter.op === "range") {
          params.push(filter.key);
          params.push(filter.min);
          params.push(filter.max);
          whereClauses.push(
            `(data->>$${paramIndex})::numeric between $${paramIndex + 1} and $${paramIndex + 2}`
          );
          paramIndex += 3;
        } else if (filter.op === "eq") {
          params.push(filter.key);
          params.push(filter.value);
          whereClauses.push(`data->>$${paramIndex} = $${paramIndex + 1}`);
          paramIndex += 2;
        }
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid filters" });
    }
  }

  let orderBy = "updated_at desc";
  if (sortKey) {
    params.push(sortKey);
    orderBy = `data->>$${paramIndex} ${sortDir === "asc" ? "asc" : "desc"}`;
  }

  const whereSQL = whereClauses.length ? `where ${whereClauses.join(" and ")}` : "";
  const client = await pool.connect();
  try {
    const rows = await client.query(
      `select row_key, data, updated_at from dataset_rows ${whereSQL} order by ${orderBy} limit $${paramIndex + 1} offset $${paramIndex + 2}`,
      [...params, Number(pageSize), offset]
    );
    const total = await client.query(
      `select count(*) from dataset_rows ${whereSQL}`,
      params
    );
    res.json({ rows: rows.rows, total: Number(total.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/gridsmith/datasets/:id/rows", async (req, res) => {
  const { rowKey, data } = req.body;
  if (!rowKey || !data) {
    return res.status(400).json({ error: "rowKey and data are required" });
  }
  const client = await pool.connect();
  try {
    await client.query(
      """
      insert into dataset_rows (dataset_id, row_key, data)
      values ($1, $2, $3)
      on conflict (dataset_id, row_key)
      do update set data = excluded.data, updated_at = now()
      """,
      [req.params.id, rowKey, data]
    );
    await client.query(
      "update datasets set updated_at = now() where id = $1",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/gridsmith/datasets/:id/rows/:rowKey", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(
      "delete from dataset_rows where dataset_id = $1 and row_key = $2",
      [req.params.id, req.params.rowKey]
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

if (require.main === module) app.listen(port, () => {
  console.log(`GridSmith server running on http://127.0.0.1:${port}`);
});

module.exports = app;
