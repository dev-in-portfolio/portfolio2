const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3123);
const DATABASE_URL =
  process.env.SNAPSHOT_VAULT_DATABASE_URL ||
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
app.use(express.json({ limit: '512kb' }));
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
    `insert into sv_users (device_key)
     values ($1)
     on conflict (device_key) do update set device_key = excluded.device_key
     returning id`,
    [deviceKey]
  );
  return rows[0].id;
}

function requireDeviceKey(req, res, next) {
  const key = req.header('X-Device-Key');
  if (!key) return res.status(400).json({ error: 'Missing X-Device-Key header' });
  req.deviceKey = key;
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

app.use('/api/snapshotvault', requireDeviceKey);

app.get('/api/snapshotvault/documents', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      'select id, title, created_at from sv_documents where user_id = $1 order by created_at desc',
      [userId]
    );
    res.json({ documents: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/snapshotvault/documents', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const title = String(req.body.title || '').trim().slice(0, 200);
    if (!title) return res.status(400).json({ error: 'title required' });
    const { rows } = await pool.query(
      'insert into sv_documents (user_id, title) values ($1, $2) returning id, title, created_at',
      [userId, title]
    );
    res.status(201).json({ document: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/snapshotvault/documents/:id/snapshots', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const allowed = await pool.query('select 1 from sv_documents where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!allowed.rows[0]) return res.status(404).json({ error: 'document not found' });
    const { rows } = await pool.query(
      `select id, version, body, summary, diff_added, diff_removed, created_at
       from sv_snapshots where document_id = $1 order by version desc`,
      [req.params.id]
    );
    res.json({ snapshots: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/snapshotvault/documents/:id/snapshots', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const allowed = await pool.query('select 1 from sv_documents where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!allowed.rows[0]) return res.status(404).json({ error: 'document not found' });
    const body = String(req.body.body || '');
    const summary = String(req.body.summary || '').slice(0, 400);
    if (!body) return res.status(400).json({ error: 'body required' });
    const latest = await pool.query('select version, body from sv_snapshots where document_id = $1 order by version desc limit 1', [req.params.id]);
    const version = (latest.rows[0]?.version || 0) + 1;
    const prevBody = latest.rows[0]?.body || '';
    const diffAdded = Math.max(0, body.length - prevBody.length);
    const diffRemoved = Math.max(0, prevBody.length - body.length);
    const { rows } = await pool.query(
      `insert into sv_snapshots (document_id, version, body, summary, diff_added, diff_removed)
       values ($1, $2, $3, $4, $5, $6)
       returning id, version, body, summary, diff_added, diff_removed, created_at`,
      [req.params.id, version, body, summary, diffAdded, diffRemoved]
    );
    res.status(201).json({ snapshot: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`snapshot-vault listening on ${PORT}`));

module.exports = app;
