require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3014);
const DATABASE_URL =
  process.env.LINEFLOW_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';
const MAX_ACTIVE_TIMERS = 50;
const MAX_PRESETS = 200;
const MAX_LABEL_LENGTH = 140;
const MAX_NAME_LENGTH = 80;
const MAX_COLOR_LENGTH = 24;

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

app.use(
  cors({
    exposedHeaders: ['X-Request-Id']
  })
);
app.use(express.json({ limit: '100kb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) {
    req.url = '/';
  } else if (req.url.startsWith(`${fnPrefix}/`)) {
    req.url = req.url.slice(fnPrefix.length);
  }
  next();
});
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  req.requestId = requestId;
  const started = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - started;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms ${requestId}`);
  });
  next();
});

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey || deviceKey.length > 100) {
    return res.status(400).json({ error: 'X-Device-Key header required.' });
  }
  req.deviceKey = deviceKey;
  return next();
}

function mapDbError(error) {
  if (error && error.code === '42P01') {
    return { status: 500, message: 'Database schema missing. Run sql/001_lineflow.sql.' };
  }
  return { status: 500, message: 'Database error.' };
}

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

async function getOrCreateUser(client, deviceKey) {
  const found = await client.query('select id from users where device_key = $1', [deviceKey]);
  if (found.rows.length) return found.rows[0].id;
  const created = await client.query(
    'insert into users (device_key) values ($1) returning id',
    [deviceKey]
  );
  return created.rows[0].id;
}

function clampLimit(value, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function normalizePreset(body) {
  return {
    name: typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LENGTH) : '',
    durationSeconds: Number(body.durationSeconds),
    color: typeof body.color === 'string' ? body.color.trim().slice(0, MAX_COLOR_LENGTH) : '#ffffff'
  };
}

function normalizeSession(body) {
  return {
    presetId: typeof body.presetId === 'string' ? body.presetId : null,
    label: typeof body.label === 'string' ? body.label.trim().slice(0, MAX_LABEL_LENGTH) : '',
    durationSeconds: Number(body.durationSeconds),
    status: typeof body.status === 'string' ? body.status : null,
    position: body.position === undefined ? null : Number(body.position),
    startedAt: body.startedAt ? new Date(body.startedAt) : null,
    completedAt: body.completedAt ? new Date(body.completedAt) : null
  };
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LineFlow API</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
    }
    body {
      margin: 0;
      background: radial-gradient(circle at top, #fef3c7 0%, #fef9c3 30%, #ecfeff 100%);
      color: #0f172a;
    }
    .hero {
      padding: 64px 24px 32px;
      max-width: 1100px;
      margin: 0 auto;
    }
    h1 {
      font-size: clamp(2.5rem, 4vw, 4rem);
      margin-bottom: 12px;
      letter-spacing: -0.03em;
    }
    .tagline {
      font-size: 1.1rem;
      color: #334155;
      max-width: 720px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-top: 32px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #0f172a;
      color: #fff;
      border-radius: 999px;
      font-size: 0.85rem;
    }
    code {
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="hero">
    <span class="pill">LineFlow API · Online</span>
    <h1>Sequence timers with precision.</h1>
    <p class="tagline">
      This service powers LineFlow’s React Native client for multi-timer boards. Every request includes
      <code>X-Device-Key</code> and uses Neon Postgres for persistence.
    </p>
    <div class="grid">
      <div class="card">
        <h3>Health</h3>
        <p>Check backend readiness and DB wiring.</p>
        <code>GET /api/timers/health</code>
      </div>
      <div class="card">
        <h3>Status</h3>
        <p>Counts for presets + active timers.</p>
        <code>GET /api/timers/status</code>
      </div>
      <div class="card">
        <h3>Presets</h3>
        <p>Create reusable durations and colors.</p>
        <code>GET /api/timers/presets</code>
      </div>
      <div class="card">
        <h3>Sessions</h3>
        <p>Track live timers and history.</p>
        <code>GET /api/timers/sessions</code>
      </div>
    </div>
    <div class="card" style="margin-top: 24px;">
      <h3>Example Request</h3>
      <p>Every request includes a device key header.</p>
      <code>curl -H "X-Device-Key: demo-device" http://127.0.0.1:3014/api/timers/health</code>
    </div>
  </div>
  <div class="footer">LineFlow backend is ready for your mobile client.</div>
</body>
</html>`);
});

app.get('/api/timers/health', asyncHandler(async (_req, res) => {
  if (!pool) return res.status(500).json({ ok: false, error: 'DATABASE_URL is not set.' });
  const result = await pool.query('select now() as now');
  return res.json({
    ok: true,
    dbTime: result.rows[0].now,
    uptimeSeconds: Math.round(process.uptime()),
    version: 'v1'
  });
}));

app.use('/api/timers', requireDeviceKey);

app.get('/api/timers/status', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const [counts, active] = await Promise.all([
      client.query(
        `select
          (select count(*) from timer_presets where user_id = $1)::int as preset_count,
          (select count(*) from timer_sessions where user_id = $1)::int as session_count`,
        [userId]
      ),
      client.query(
        `select count(*)::int as active_count
         from timer_sessions
         where user_id = $1 and status in ('pending','running')`,
        [userId]
      )
    ]);
    return res.json({
      presets: counts.rows[0].preset_count,
      sessions: counts.rows[0].session_count,
      active: active.rows[0].active_count
    });
  } finally {
    client.release();
  }
}));

app.get('/api/timers/presets', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const limit = clampLimit(req.query.limit, 200);
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      `select id, name, duration_seconds, color, created_at
       from timer_presets
       where user_id = $1
       order by created_at desc
       limit $2`,
      [userId, limit]
    );
    return res.json({ presets: result.rows });
  } finally {
    client.release();
  }
}));

app.post('/api/timers/presets', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const payload = normalizePreset(req.body || {});
  if (!payload.name) return res.status(400).json({ error: 'name is required.' });
  if (!Number.isFinite(payload.durationSeconds) || payload.durationSeconds <= 0) {
    return res.status(400).json({ error: 'durationSeconds is required.' });
  }
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const count = await client.query(
      'select count(*)::int as count from timer_presets where user_id = $1',
      [userId]
    );
    if (count.rows[0].count >= MAX_PRESETS) {
      return res.status(400).json({ error: 'Preset limit reached.' });
    }
    const created = await client.query(
      `insert into timer_presets (user_id, name, duration_seconds, color)
       values ($1, $2, $3, $4)
       returning id, name, duration_seconds, color, created_at`,
      [userId, payload.name, payload.durationSeconds, payload.color]
    );
    return res.status(201).json({ preset: created.rows[0] });
  } finally {
    client.release();
  }
}));

app.delete('/api/timers/presets/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'delete from timer_presets where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    return res.json({ ok: result.rowCount > 0 });
  } finally {
    client.release();
  }
}));

app.get('/api/timers/sessions', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const limit = clampLimit(req.query.limit, 100);
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const params = [userId];
    let clause = 'where user_id = $1';
    if (status) {
      params.push(status);
      clause += ` and status = $${params.length}`;
    }
    params.push(limit);
    const result = await client.query(
      `select id, preset_id, label, duration_seconds, started_at, completed_at, status, position, created_at
       from timer_sessions
       ${clause}
       order by created_at desc
       limit $${params.length}`,
      params
    );
    return res.json({ sessions: result.rows });
  } finally {
    client.release();
  }
}));

app.post('/api/timers/sessions', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const payload = normalizeSession(req.body || {});
  if (!Number.isFinite(payload.durationSeconds) || payload.durationSeconds <= 0) {
    return res.status(400).json({ error: 'durationSeconds is required.' });
  }
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const activeCount = await client.query(
      `select count(*)::int as count
       from timer_sessions
       where user_id = $1 and status in ('pending','running')`,
      [userId]
    );
    if (activeCount.rows[0].count >= MAX_ACTIVE_TIMERS) {
      return res.status(400).json({ error: 'Active timer limit reached.' });
    }
    const created = await client.query(
      `insert into timer_sessions (user_id, preset_id, label, duration_seconds, status, position, started_at, completed_at)
       values ($1, $2, $3, $4, 'pending', $5, $6, $7)
       returning id, preset_id, label, duration_seconds, started_at, completed_at, status, position, created_at`,
      [
        userId,
        payload.presetId,
        payload.label,
        payload.durationSeconds,
        payload.position || 0,
        payload.startedAt ? payload.startedAt.toISOString() : null,
        payload.completedAt ? payload.completedAt.toISOString() : null
      ]
    );
    return res.status(201).json({ session: created.rows[0] });
  } finally {
    client.release();
  }
}));

app.patch('/api/timers/sessions/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const payload = normalizeSession(req.body || {});
  const updates = [];
  const values = [];
  if (payload.status) {
    const allowed = ['pending', 'running', 'done', 'cancelled'];
    if (!allowed.includes(payload.status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    values.push(payload.status);
    updates.push(`status = $${values.length}`);
  }
  if (payload.position !== null && Number.isFinite(payload.position)) {
    values.push(payload.position);
    updates.push(`position = $${values.length}`);
  }
  if (payload.startedAt && !Number.isNaN(payload.startedAt.getTime())) {
    values.push(payload.startedAt.toISOString());
    updates.push(`started_at = $${values.length}`);
  }
  if (payload.completedAt && !Number.isNaN(payload.completedAt.getTime())) {
    values.push(payload.completedAt.toISOString());
    updates.push(`completed_at = $${values.length}`);
  }
  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const idIndex = values.length + 1;
    const userIndex = values.length + 2;
    values.push(req.params.id, userId);
    const result = await client.query(
      `update timer_sessions
       set ${updates.join(', ')}
       where id = $${idIndex} and user_id = $${userIndex}
       returning id, preset_id, label, duration_seconds, started_at, completed_at, status, position, created_at`,
      values
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    return res.json({ session: result.rows[0] });
  } finally {
    client.release();
  }
}));

app.delete('/api/timers/sessions/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'delete from timer_sessions where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    return res.json({ ok: result.rowCount > 0 });
  } finally {
    client.release();
  }
}));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((error, req, res, _next) => {
  const mapped = mapDbError(error);
  res.status(mapped.status).json({ error: mapped.message, requestId: req.requestId });
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`LineFlow API running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
