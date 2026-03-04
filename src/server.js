const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3093);
const DATABASE_URL =
  process.env.QUEUESPLICE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
    })
  : null;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) {
    req.url = '/';
  } else if (req.url.startsWith(`${fnPrefix}/`)) {
    req.url = req.url.slice(fnPrefix.length);
  }
  next();
});

function requireDb() {
  if (!pool) {
    const error = new Error('DATABASE_URL not configured');
    error.status = 500;
    throw error;
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/health/db', async (_req, res) => {
  if (!pool) return res.json({ ok: false, error: 'DATABASE_URL not configured' });
  try {
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/jobs/stats', async (_req, res, next) => {
  try {
    requireDb();
    const { rows } = await pool.query(
      `select status, count(*)::int as count from jobs group by status order by status`
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/jobs', async (req, res, next) => {
  try {
    requireDb();
    const status = req.query.status ? String(req.query.status) : '';
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `where status = $${params.length}`;
    }
    params.push(limit);
    const { rows } = await pool.query(
      `select id, kind, status, payload, priority, attempts, max_attempts, available_at, lease_owner, lease_until, last_error, created_at, updated_at
       from jobs ${where} order by created_at desc limit $${params.length}`,
      params
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/jobs', async (req, res, next) => {
  try {
    requireDb();
    const kind = String(req.body.kind || '').trim().slice(0, 80);
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const priority = Number(req.body.priority || 0);
    const maxAttempts = Math.min(20, Math.max(1, Number(req.body.maxAttempts || 5)));
    if (!kind) {
      const error = new Error('kind required');
      error.status = 422;
      throw error;
    }
    const { rows } = await pool.query(
      `insert into jobs (kind, payload, priority, max_attempts)
       values ($1, $2, $3, $4)
       returning id, kind, status, created_at`,
      [kind, payload, priority, maxAttempts]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/jobs/lease', async (req, res, next) => {
  const client = await pool.connect();
  try {
    requireDb();
    const worker = String(req.body.worker || 'worker-1').trim().slice(0, 80);
    const ttl = Math.min(600, Math.max(10, Number(req.body.ttlSeconds || 60)));
    await client.query('begin');
    const picked = await client.query(
      `select id from jobs
       where status = 'ready' and available_at <= now()
       order by priority desc, created_at asc
       for update skip locked
       limit 1`
    );
    if (!picked.rows[0]) {
      await client.query('commit');
      return res.json({ leased: null });
    }
    const { rows } = await client.query(
      `update jobs
       set status = 'running', lease_owner = $1, lease_until = now() + ($2 || ' seconds')::interval, updated_at = now()
       where id = $3
       returning id, kind, status, payload, attempts, max_attempts, lease_owner, lease_until`,
      [worker, String(ttl), picked.rows[0].id]
    );
    await client.query('commit');
    res.json({ leased: rows[0] });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/jobs/:id/complete', async (req, res, next) => {
  try {
    requireDb();
    const result = await pool.query(
      `update jobs set status = 'done', updated_at = now() where id = $1 returning id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/jobs/:id/fail', async (req, res, next) => {
  try {
    requireDb();
    const err = String(req.body.error || 'worker error').slice(0, 500);
    const row = await pool.query(
      'select attempts, max_attempts from jobs where id = $1 limit 1',
      [req.params.id]
    );
    if (!row.rows[0]) return res.status(404).json({ error: 'Job not found' });
    const attempts = Number(row.rows[0].attempts) + 1;
    const maxAttempts = Number(row.rows[0].max_attempts);
    const status = attempts >= maxAttempts ? 'dead' : 'ready';
    await pool.query(
      `update jobs
       set status = $1, attempts = $2, last_error = $3, lease_owner = '', lease_until = null,
           available_at = case when $1 = 'ready' then now() + interval '30 seconds' else available_at end,
           updated_at = now()
       where id = $4`,
      [status, attempts, err, req.params.id]
    );
    res.json({ ok: true, status, attempts, maxAttempts });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`queuesplice listening on ${PORT}`));
}

module.exports = app;
