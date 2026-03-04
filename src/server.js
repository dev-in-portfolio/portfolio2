const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL =
  process.env.INTAKE_DATABASE_URL ||
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
        create table if not exists hi_users (
          id uuid primary key default gen_random_uuid(),
          device_key text not null unique,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists hi_records (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references hi_users(id) on delete cascade,
          event_type text not null,
          payload jsonb not null,
          source text not null default 'manual',
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists hi_quarantine (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references hi_users(id) on delete cascade,
          event_type text not null,
          payload jsonb not null,
          reason text not null,
          source text not null default 'manual',
          created_at timestamptz not null default now()
        )
      `);
      await pool.query('create index if not exists idx_hi_records_user_time on hi_records(user_id, created_at desc)');
      await pool.query('create index if not exists idx_hi_quarantine_user_time on hi_quarantine(user_id, created_at desc)');
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  await schemaReady;
}

async function getUserId(deviceKey) {
  await pool.query('insert into hi_users (device_key) values ($1) on conflict do nothing', [deviceKey]);
  const { rows } = await pool.query('select id from hi_users where device_key = $1', [deviceKey]);
  return rows[0].id;
}

function requireDeviceKey(req, res, next) {
  const key = req.header('x-device-key');
  if (!key) return res.status(400).json({ error: 'Missing X-Device-Key header' });
  req.deviceKey = key;
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'intake' }));
app.get('/api/health/db', async (_req, res) => {
  if (!pool) return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' });
  try {
    await ensureSchema();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/intake', requireDeviceKey, async (req, res, next) => {
  try {
    await ensureSchema();
    const userId = await getUserId(req.deviceKey);
    const eventType = String(req.body.eventType || '').trim();
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const source = String(req.body.source || 'manual').trim();
    if (!eventType) return res.status(400).json({ error: 'eventType required' });

    const quarantine = !payload || Object.keys(payload).length === 0 || payload.invalid === true;
    if (quarantine) {
      const { rows } = await pool.query(
        'insert into hi_quarantine (user_id, event_type, payload, reason, source) values ($1, $2, $3, $4, $5) returning *',
        [userId, eventType, payload, 'empty_payload_or_invalid_flag', source]
      );
      return res.status(202).json({ quarantined: true, record: rows[0] });
    }

    const { rows } = await pool.query(
      'insert into hi_records (user_id, event_type, payload, source) values ($1, $2, $3, $4) returning *',
      [userId, eventType, payload, source]
    );
    res.status(201).json({ quarantined: false, record: rows[0] });
  } catch (e) { next(e); }
});

app.get('/api/intake/records', requireDeviceKey, async (req, res, next) => {
  try {
    await ensureSchema();
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      'select id, event_type, payload, source, created_at from hi_records where user_id = $1 order by created_at desc limit 200',
      [userId]
    );
    res.json({ records: rows });
  } catch (e) { next(e); }
});

app.get('/api/intake/quarantine', requireDeviceKey, async (req, res, next) => {
  try {
    await ensureSchema();
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      'select id, event_type, payload, reason, source, created_at from hi_quarantine where user_id = $1 order by created_at desc limit 200',
      [userId]
    );
    res.json({ quarantine: rows });
  } catch (e) { next(e); }
});

app.post('/api/admin/quarantine/:id/retry', requireDeviceKey, async (req, res, next) => {
  try {
    await ensureSchema();
    const userId = await getUserId(req.deviceKey);
    const id = String(req.params.id || '').trim();
    const { rows } = await pool.query(
      'select id, event_type, payload, source from hi_quarantine where id = $1 and user_id = $2',
      [id, userId]
    );
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'quarantine_item_not_found' });

    const promoted = await pool.query(
      'insert into hi_records (user_id, event_type, payload, source) values ($1, $2, $3, $4) returning id, event_type, payload, source, created_at',
      [userId, item.event_type, item.payload, item.source]
    );
    await pool.query('delete from hi_quarantine where id = $1 and user_id = $2', [id, userId]);
    res.json({ ok: true, record: promoted.rows[0] });
  } catch (e) { next(e); }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`intake listening on ${PORT}`));
}

module.exports = app;
