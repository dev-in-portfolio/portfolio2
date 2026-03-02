import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3021;

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

function normalizeDatabaseUrl(connectionString) {
  if (!connectionString) return connectionString;
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    if (sslmode === "require" && !url.searchParams.has("uselibpqcompat")) {
      url.searchParams.set("uselibpqcompat", "true");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

const pool = new Pool({ connectionString: normalizeDatabaseUrl(databaseUrl) });

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

create table if not exists timelines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists timeline_layers (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references timelines(id) on delete cascade,
  name text not null,
  color text not null default '#888888',
  sort_order int not null default 0
);

create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references timelines(id) on delete cascade,
  layer_id uuid references timeline_layers(id) on delete set null,
  title text not null,
  description text not null default '',
  start_time timestamptz not null,
  end_time timestamptz,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_time on timeline_events(start_time);
create index if not exists idx_events_timeline on timeline_events(timeline_id);
create index if not exists idx_events_tags on timeline_events using gin(tags);
`;

async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(schemaSQL);
  } finally {
    client.release();
  }
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
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  if (!databaseUrl) {
    return res.status(500).json({ error: "Database is not configured" });
  }

  try {
    await ensureSchema();
    const needsAuth =
      req.path.startsWith("/api/timelines") ||
      req.path.startsWith("/api/layers") ||
      req.path.startsWith("/api/events");
    if (needsAuth) {
      const deviceKey = req.header("x-device-key");
      req.userId = await getUserId(deviceKey);
    }
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/timelines", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, description, updated_at from timelines where user_id = $1 order by updated_at desc",
      [req.userId]
    );
    res.json({ timelines: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/timelines", async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const client = await pool.connect();
  try {
    const result = await client.query(
      "insert into timelines (user_id, name, description) values ($1, $2, $3) returning id, name, description",
      [req.userId, name, description || ""]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/timelines/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, description from timelines where id = $1 and user_id = $2",
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

app.patch("/api/timelines/:id", async (req, res) => {
  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      update timelines
      set name = coalesce($1, name),
          description = coalesce($2, description),
          updated_at = now()
      where id = $3 and user_id = $4
      returning id, name, description
      `,
      [name ?? null, description ?? null, req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/timelines/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("delete from timelines where id = $1 and user_id = $2", [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/timelines/:id/layers", async (req, res) => {
  const { name, color, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      insert into timeline_layers (timeline_id, name, color, sort_order)
      values ($1, $2, $3, $4)
      returning id, name, color, sort_order
      `,
      [req.params.id, name, color || "#888888", sort_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.patch("/api/layers/:id", async (req, res) => {
  const { name, color, sort_order } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      update timeline_layers
      set name = coalesce($1, name),
          color = coalesce($2, color),
          sort_order = coalesce($3, sort_order)
      where id = $4
      returning id, name, color, sort_order
      `,
      [name ?? null, color ?? null, sort_order ?? null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/layers/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("delete from timeline_layers where id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/timelines/:id/events", async (req, res) => {
  const { from, to, tags } = req.query;
  const params = [req.params.id];
  let where = "timeline_id = $1";
  if (from) {
    params.push(from);
    where += ` and start_time >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` and start_time <= $${params.length}`;
  }
  if (tags) {
    params.push(tags.split(","));
    where += ` and tags && $${params.length}`;
  }
  const client = await pool.connect();
  try {
    const result = await client.query(
      `select id, layer_id, title, description, start_time, end_time, tags, metadata from timeline_events where ${where} order by start_time asc`,
      params
    );
    res.json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/timelines/:id/events", async (req, res) => {
  const { layer_id, title, description, start_time, end_time, tags, metadata } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: "title and start_time required" });
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      insert into timeline_events (timeline_id, layer_id, title, description, start_time, end_time, tags, metadata)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id, title, start_time, end_time, tags, layer_id
      `,
      [
        req.params.id,
        layer_id || null,
        title,
        description || "",
        start_time,
        end_time || null,
        tags || [],
        metadata || {},
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.patch("/api/events/:id", async (req, res) => {
  const { title, description, start_time, end_time, tags, metadata, layer_id } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      update timeline_events
      set title = coalesce($1, title),
          description = coalesce($2, description),
          start_time = coalesce($3, start_time),
          end_time = coalesce($4, end_time),
          tags = coalesce($5, tags),
          metadata = coalesce($6, metadata),
          layer_id = coalesce($7, layer_id),
          updated_at = now()
      where id = $8
      returning id, title, start_time, end_time, tags, layer_id
      `,
      [title ?? null, description ?? null, start_time ?? null, end_time ?? null, tags ?? null, metadata ?? null, layer_id ?? null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete("/api/events/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("delete from timeline_events where id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/timelines/:id/layers", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "select id, name, color, sort_order from timeline_layers where timeline_id = $1 order by sort_order asc",
      [req.params.id]
    );
    res.json({ layers: result.rows });
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
    console.log(`Chronicle running on http://127.0.0.1:${port}`);
  });
}

export default app;
