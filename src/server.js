const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL =
  process.env.NEONSCOPE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    })
  : null;

let schemaReady;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  const prefix = '/.netlify/functions/server';
  if (req.url === prefix) req.url = '/';
  else if (req.url.startsWith(`${prefix}/`)) req.url = req.url.slice(prefix.length);
  next();
});

function requireDb() {
  if (!pool) {
    const err = new Error('DATABASE_URL not configured');
    err.status = 500;
    throw err;
  }
}

async function ensureSchema() {
  requireDb();
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query('create extension if not exists pgcrypto');
      await pool.query(`
        create table if not exists ns_saved_queries (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          sql_text text not null,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists ns_query_audit (
          id uuid primary key default gen_random_uuid(),
          query_name text,
          sql_text text not null,
          row_count int not null default 0,
          duration_ms int not null default 0,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query('create index if not exists idx_ns_saved_queries_time on ns_saved_queries(created_at desc)');
      await pool.query('create index if not exists idx_ns_query_audit_time on ns_query_audit(created_at desc)');
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  await schemaReady;
}

function isReadOnlySql(sql) {
  const q = String(sql || '').trim().toLowerCase();
  if (!q) return false;
  if (!q.startsWith('select') && !q.startsWith('with')) return false;
  const banned = [' insert ', ' update ', ' delete ', ' drop ', ' alter ', ' truncate ', ' create ', ' grant ', ' revoke '];
  return !banned.some((w) => q.includes(w));
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'neonscope' }));
app.get('/api/health/db', async (_req, res) => {
  if (!pool) return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' });
  try {
    await ensureSchema();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/neonscope/tables', async (_req, res, next) => {
  try {
    await ensureSchema();
    const { rows } = await pool.query(
      `select table_schema, table_name
       from information_schema.tables
       where table_schema not in ('pg_catalog', 'information_schema')
       order by table_schema, table_name`
    );
    res.json({ tables: rows });
  } catch (e) { next(e); }
});

app.post('/api/neonscope/query', async (req, res, next) => {
  try {
    await ensureSchema();
    const sql = String(req.body.sql || '').trim();
    const name = String(req.body.name || '').trim() || null;
    const limit = Math.min(200, Math.max(1, Number(req.body.limit || 50)));
    if (!isReadOnlySql(sql)) return res.status(400).json({ error: 'Only read-only SELECT/CTE queries are allowed' });
    const wrapped = `select * from (${sql}) as q limit ${limit}`;
    const start = Date.now();
    const result = await pool.query(wrapped);
    const duration = Date.now() - start;
    await pool.query('insert into ns_query_audit (query_name, sql_text, row_count, duration_ms) values ($1, $2, $3, $4)', [name, sql, result.rowCount || 0, duration]);
    res.json({ columns: result.fields.map((f) => f.name), rows: result.rows, rowCount: result.rowCount || 0, durationMs: duration });
  } catch (e) { next(e); }
});

app.get('/api/neonscope/saved', async (_req, res, next) => {
  try {
    await ensureSchema();
    const { rows } = await pool.query('select id, name, sql_text, created_at from ns_saved_queries order by created_at desc limit 100');
    res.json({ queries: rows });
  } catch (e) { next(e); }
});

app.post('/api/neonscope/saved', async (req, res, next) => {
  try {
    await ensureSchema();
    const name = String(req.body.name || '').trim();
    const sql = String(req.body.sql || '').trim();
    if (!name || !sql) return res.status(400).json({ error: 'name and sql required' });
    const { rows } = await pool.query('insert into ns_saved_queries (name, sql_text) values ($1, $2) returning id, name, sql_text, created_at', [name, sql]);
    res.status(201).json({ query: rows[0] });
  } catch (e) { next(e); }
});

app.delete('/api/neonscope/saved/:id', async (req, res, next) => {
  try {
    await ensureSchema();
    await pool.query('delete from ns_saved_queries where id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.get('/api/neonscope/audit', async (_req, res, next) => {
  try {
    await ensureSchema();
    const { rows } = await pool.query('select id, query_name, row_count, duration_ms, created_at from ns_query_audit order by created_at desc limit 100');
    res.json({ events: rows });
  } catch (e) { next(e); }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`neonscope listening on ${PORT}`));
}

module.exports = app;
