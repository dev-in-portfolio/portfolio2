const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3111);
const DATABASE_URL =
  process.env.QWIK_ATLAS_DATABASE_URL ||
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
app.use(express.json({ limit: '128kb' }));
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

app.get('/api/qwik-atlas/views', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const route = String(req.query.route || '/');
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select id, name, route, state, created_at, updated_at
       from qwik_views where user_id = $1 and route = $2
       order by updated_at desc`,
      [userId, route]
    );
    res.json({ views: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/qwik-atlas/views', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const name = String(req.body.name || '').trim().slice(0, 80);
    const route = String(req.body.route || '/').slice(0, 200);
    const state = req.body.state && typeof req.body.state === 'object' ? req.body.state : null;
    if (!name || !state) return res.status(400).json({ error: 'name and state are required' });
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `insert into qwik_views (user_id, name, route, state)
       values ($1, $2, $3, $4)
       returning id, name, route, state, created_at, updated_at`,
      [userId, name, route, state]
    );
    res.status(201).json({ view: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/qwik-atlas/views/:id', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const name = req.body.name ? String(req.body.name).slice(0, 80) : null;
    const state = req.body.state && typeof req.body.state === 'object' ? req.body.state : null;
    const { rows } = await pool.query(
      `update qwik_views
       set name = coalesce($1, name), state = coalesce($2, state), updated_at = now()
       where id = $3 and user_id = $4
       returning id, name, route, state, created_at, updated_at`,
      [name, state, req.params.id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'view not found' });
    res.json({ view: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/qwik-atlas/views/:id', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const result = await pool.query('delete from qwik_views where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'view not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`qwik-atlas listening on ${PORT}`));
}

module.exports = app;
