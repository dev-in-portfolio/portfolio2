const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3121);
const DATABASE_URL =
  process.env.QUEUEGAUGE_DATABASE_URL ||
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
app.use(express.json({ limit: '256kb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) req.url = '/';
  else if (req.url.startsWith(`${fnPrefix}/`)) req.url = req.url.slice(fnPrefix.length);
  next();
});

function requireDb() {
  if (!pool) {
    const error = new Error('DATABASE_URL not configured');
    error.status = 500;
    throw error;
  }
}

async function getUserId(deviceKey) {
  const { rows } = await pool.query(
    `insert into users (device_key)
     values ($1)
     on conflict (device_key) do update set device_key = excluded.device_key
     returning id`,
    [deviceKey]
  );
  return rows[0].id;
}

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey) return res.status(400).json({ error: 'Missing X-Device-Key header' });
  req.deviceKey = deviceKey;
  next();
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

app.use('/api/queuegauge', requireDeviceKey);

app.get('/api/queuegauge/stats', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select status, count(*)::int as count from jobs where user_id = $1 group by status order by status`,
      [userId]
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/queuegauge/jobs', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const status = req.query.status ? String(req.query.status) : '';
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const params = [userId];
    let where = 'where user_id = $1';
    if (status) {
      params.push(status);
      where += ` and status = $${params.length}`;
    }
    params.push(limit);
    const { rows } = await pool.query(
      `select id, type, payload, status, priority, attempts, max_attempts, leased_until, lease_owner, last_error, run_after, created_at, updated_at
       from jobs ${where} order by created_at desc limit $${params.length}`,
      params
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/queuegauge/jobs', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const type = String(req.body.type || '').trim().slice(0, 120);
    if (!type) return res.status(400).json({ error: 'type required' });
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const priority = Number(req.body.priority || 0);
    const maxAttempts = Math.min(20, Math.max(1, Number(req.body.maxAttempts || 3)));
    const { rows } = await pool.query(
      `insert into jobs (user_id, type, payload, priority, max_attempts)
       values ($1, $2, $3, $4, $5)
       returning id, type, payload, status, priority, attempts, max_attempts, created_at`,
      [userId, type, payload, priority, maxAttempts]
    );
    res.status(201).json({ job: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/queuegauge/lease', async (req, res, next) => {
  const client = await pool.connect();
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const owner = String(req.body.owner || 'worker-1').slice(0, 100);
    const ttlSeconds = Math.min(600, Math.max(10, Number(req.body.ttlSeconds || 60)));
    await client.query('begin');
    const pick = await client.query(
      `select id from jobs
       where user_id = $1 and status = 'queued' and run_after <= now()
       order by priority desc, created_at asc
       for update skip locked
       limit 1`,
      [userId]
    );
    if (!pick.rows[0]) {
      await client.query('commit');
      return res.json({ leased: null });
    }
    const { rows } = await client.query(
      `update jobs
       set status = 'leased', lease_owner = $1, leased_until = now() + ($2 || ' seconds')::interval, updated_at = now()
       where id = $3
       returning id, type, payload, status, lease_owner, leased_until`,
      [owner, String(ttlSeconds), pick.rows[0].id]
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

app.post('/api/queuegauge/jobs/:id/complete', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const out = await pool.query(
      `update jobs set status = 'succeeded', lease_owner = '', leased_until = null, updated_at = now()
       where id = $1 and user_id = $2 returning id`,
      [req.params.id, userId]
    );
    if (!out.rows[0]) return res.status(404).json({ error: 'job not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/queuegauge/jobs/:id/fail', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const reason = String(req.body.error || 'failed').slice(0, 1000);
    const row = await pool.query('select attempts, max_attempts from jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!row.rows[0]) return res.status(404).json({ error: 'job not found' });
    const attempts = Number(row.rows[0].attempts) + 1;
    const maxAttempts = Number(row.rows[0].max_attempts);
    const nextStatus = attempts >= maxAttempts ? 'failed' : 'queued';
    await pool.query(
      `update jobs
       set status = $1, attempts = $2, last_error = $3, lease_owner = '', leased_until = null,
           run_after = case when $1 = 'queued' then now() + interval '30 seconds' else run_after end,
           updated_at = now()
       where id = $4 and user_id = $5`,
      [nextStatus, attempts, reason, req.params.id, userId]
    );
    res.json({ ok: true, status: nextStatus, attempts, maxAttempts });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`queuegauge listening on ${PORT}`));

module.exports = app;
