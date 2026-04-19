const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_PASSCODE = process.env.APP_PASSCODE || '';
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

if (APP_PASSCODE) {
  // Must be registered before routes to actually guard them.
  app.use((req, res, next) => {
    // Keep health endpoints reachable for diagnostics.
    if (req.path.startsWith('/api/health')) return next();

    const passcode = req.headers['x-passcode'] || req.query.passcode;
    if (passcode !== APP_PASSCODE) {
      return res.status(401).json({ error: 'Unauthorized - invalid or missing passcode' });
    }
    return next();
  });
}

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
          tags jsonb default '[]'::jsonb,
          created_at timestamptz not null default now()
        )
      `);
      // Ensure tags exists for older deployments.
      await pool.query(`alter table ns_saved_queries add column if not exists tags jsonb default '[]'::jsonb`);
      await pool.query(`update ns_saved_queries set tags = '[]'::jsonb where tags is null`);
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
      await pool.query('create index if not exists idx_ns_saved_queries_tags on ns_saved_queries using gin(tags)');
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  await schemaReady;
}

function isReadOnlySql(sql) {
  let q = String(sql || '').trim();
  if (!q) return false;

  // Disallow multi-statement SQL.
  q = q.replace(/[;\s]+$/g, '');
  if (q.includes(';')) return false;

  const lower = q.toLowerCase();
  if (!lower.startsWith('select') && !lower.startsWith('with')) return false;

  // Be strict: if any write-capable keyword appears, reject.
  const bannedRe = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|do)\b/i;
  if (bannedRe.test(q)) return false;

  return true;
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

// Enhanced endpoint: Get table columns and metadata
app.get('/api/neonscope/tables/:schema/:table/columns', async (req, res, next) => {
  try {
    await ensureSchema();
    const { schema, table } = req.params;
    
    // Validate table exists
    const tableCheck = await pool.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      [schema, table]
    );
    
    if (tableCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Get column metadata
    const { rows } = await pool.query(
      `SELECT column_name, data_type, is_nullable, character_maximum_length, numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table]
    );
    
    // Get index information
    const indexes = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = $1 AND tablename = $2`,
      [schema, table]
    );
    
    // Get estimated row count
    const countResult = await pool.query(
      'SELECT reltuples as estimated_rows FROM pg_class WHERE relname = $1',
      [table]
    );
    
    res.json({
      table: { schema, name: table },
      columns: rows,
      indexes: indexes.rows,
      estimated_rows: countResult.rows[0]?.reltuples || 0
    });
  } catch (e) { next(e); }
});

// Enhanced endpoint: Explain plan for safe queries
app.post('/api/neonscope/explain', async (req, res, next) => {
  try {
    await ensureSchema();
    const sql = String(req.body.sql || '').trim();
    
    if (!isReadOnlySql(sql)) {
      return res.status(400).json({ error: 'Only read-only SELECT/CTE queries are allowed for EXPLAIN' });
    }
    
    // Wrap in EXPLAIN ANALYZE
    const explainSql = `EXPLAIN ANALYZE ${sql}`;
    const { rows } = await pool.query(explainSql);
    
    res.json({
      plan: rows.map(row => row['QUERY PLAN']),
      query: sql
    });
  } catch (e) { next(e); }
});

// Enhanced endpoint: Query performance statistics
app.get('/api/neonscope/performance', async (_req, res, next) => {
  try {
    await ensureSchema();
    
    // Get recent query performance
    const recentQueries = await pool.query(
      `SELECT query_name, AVG(duration_ms) as avg_duration, 
              MAX(duration_ms) as max_duration, COUNT(*) as execution_count
       FROM ns_query_audit
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY query_name
       ORDER BY avg_duration DESC
       LIMIT 10`
    );
    
    // Get overall statistics
    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_queries,
        AVG(duration_ms) as avg_duration,
        MAX(duration_ms) as max_duration,
        SUM(row_count) as total_rows_returned
       FROM ns_query_audit`
    );
    
    res.json({
      recent_queries: recentQueries.rows,
      statistics: stats.rows[0] || {}
    });
  } catch (e) { next(e); }
});

// Enhanced endpoint: Query tagging/folders (simple implementation)
app.post('/api/neonscope/saved/:id/tag', async (req, res, next) => {
  try {
    await ensureSchema();
    const queryId = req.params.id;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags must be an array' });
    }

    // Update query with tags (stored as JSON array)
    await pool.query(
      'UPDATE ns_saved_queries SET tags = $1::jsonb WHERE id = $2',
      [JSON.stringify(tags), queryId]
    );

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Enhanced endpoint: Get saved queries with tags
app.get('/api/neonscope/saved-with-tags', async (_req, res, next) => {
  try {
    await ensureSchema();
    const { rows } = await pool.query(
      'select id, name, sql_text, tags, created_at from ns_saved_queries order by created_at desc limit 100'
    );
    
    // Parse tags from JSON
    const queries = rows.map(row => ({
      ...row,
      tags: row.tags == null ? [] : (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags)
    }));
    
    res.json({ queries });
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
