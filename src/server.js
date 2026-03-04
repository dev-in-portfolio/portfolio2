require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3013);
const DATABASE_URL =
  process.env.PALMLEDGER_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';
const MAX_ENTRIES = 200000;
const MAX_CATEGORIES = 500;
const MAX_NOTE_LENGTH = 5000;
const MAX_TITLE_LENGTH = 200;
const MAX_UNIT_LENGTH = 12;

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
    return {
      status: 500,
      message: 'Database schema missing. Run sql/001_palmledger.sql.'
    };
  }
  return {
    status: 500,
    message: 'Database error.'
  };
}

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

async function getOrCreateUser(client, deviceKey) {
  const found = await client.query(
    'select id from users where device_key = $1',
    [deviceKey]
  );
  if (found.rows.length) {
    return found.rows[0].id;
  }
  const created = await client.query(
    'insert into users (device_key) values ($1) returning id',
    [deviceKey]
  );
  return created.rows[0].id;
}

function clampLimit(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function parseCursor(cursor) {
  if (!cursor) return null;
  const [occurredAt, id] = cursor.split('|');
  if (!occurredAt || !id) return null;
  const parsedDate = new Date(occurredAt);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return { occurredAt: parsedDate.toISOString(), id };
}

function buildCursor(row) {
  return `${row.occurred_at.toISOString()}|${row.id}`;
}

function normalizeEntryPayload(body) {
  const payload = {
    title: typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE_LENGTH) : '',
    categoryId: typeof body.categoryId === 'string' ? body.categoryId : null,
    amountNum: body.amountNum === null || body.amountNum === undefined ? null : Number(body.amountNum),
    amountUnit: typeof body.amountUnit === 'string' ? body.amountUnit.trim().slice(0, MAX_UNIT_LENGTH) : '',
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : null,
    note: typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : ''
  };

  if (payload.amountNum !== null && Number.isNaN(payload.amountNum)) {
    payload.amountNum = null;
  }
  if (payload.occurredAt && Number.isNaN(payload.occurredAt.getTime())) {
    payload.occurredAt = null;
  }
  return payload;
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PalmLedger API</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
    }
    body {
      margin: 0;
      background: radial-gradient(circle at top, #f2f6ff 0%, #ecf0ff 35%, #f7f2ff 100%);
      color: #111827;
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
      color: #374151;
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
    .card h3 {
      margin: 0 0 8px;
      font-size: 1rem;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #111827;
      color: #fff;
      border-radius: 999px;
      font-size: 0.85rem;
    }
    code {
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 6px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="hero">
    <span class="pill">PalmLedger API · Online</span>
    <h1>Capture micro-ledger events fast.</h1>
    <p class="tagline">
      This service powers PalmLedger’s React Native client. Every request must include
      <code>X-Device-Key</code> and uses Neon Postgres for persistence.
    </p>
    <div class="grid">
      <div class="card">
        <h3>Health</h3>
        <p>Check backend readiness and DB wiring.</p>
        <code>GET /api/ledger/health</code>
      </div>
      <div class="card">
        <h3>Status</h3>
        <p>Quick counts + last entry timestamp per device.</p>
        <code>GET /api/ledger/status</code>
      </div>
      <div class="card">
        <h3>Entries</h3>
        <p>Create, edit, and paginate ledger events.</p>
        <code>GET /api/ledger/entries</code>
      </div>
      <div class="card">
        <h3>Categories</h3>
        <p>Personalize your capture flow.</p>
        <code>POST /api/ledger/categories</code>
      </div>
      <div class="card">
        <h3>Rollups</h3>
        <p>7/30 day totals by day or category.</p>
        <code>GET /api/ledger/rollups</code>
      </div>
    </div>
    <div class="card" style="margin-top: 24px;">
      <h3>Example Request</h3>
      <p>Every request includes a device key header.</p>
      <code>curl -H "X-Device-Key: demo-device" http://127.0.0.1:3013/api/ledger/health</code>
    </div>
  </div>
  <div class="footer">PalmLedger backend is ready for your mobile client.</div>
</body>
</html>`);
});

app.get('/api/ledger/health', asyncHandler(async (_req, res) => {
  if (!pool) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL is not set.' });
  }
  const result = await pool.query('select now() as now');
  return res.json({
    ok: true,
    dbTime: result.rows[0].now,
    uptimeSeconds: Math.round(process.uptime()),
    version: 'v1'
  });
}));

app.use('/api/ledger', requireDeviceKey);

app.get('/api/ledger/status', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const [counts, recent] = await Promise.all([
      client.query(
        `select
          (select count(*) from ledger_entries where user_id = $1)::int as entry_count,
          (select count(*) from ledger_categories where user_id = $1)::int as category_count`,
        [userId]
      ),
      client.query(
        `select occurred_at from ledger_entries
         where user_id = $1
         order by occurred_at desc
         limit 1`,
        [userId]
      )
    ]);
    return res.json({
      entries: counts.rows[0].entry_count,
      categories: counts.rows[0].category_count,
      lastEntryAt: recent.rows[0]?.occurred_at || null
    });
  } finally {
    client.release();
  }
}));

app.get('/api/ledger/categories', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'select id, name, kind, created_at from ledger_categories where user_id = $1 order by name asc',
      [userId]
    );
    return res.json({ categories: result.rows });
  } finally {
    client.release();
  }
}));

app.post('/api/ledger/categories', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const { name, kind } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required.' });
  }
  const safeName = name.trim().slice(0, 80);
  const safeKind = typeof kind === 'string' ? kind.trim().slice(0, 24) : 'generic';
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const count = await client.query(
      'select count(*)::int as count from ledger_categories where user_id = $1',
      [userId]
    );
    if (count.rows[0].count >= MAX_CATEGORIES) {
      return res.status(400).json({ error: 'Category limit reached.' });
    }
    const created = await client.query(
      'insert into ledger_categories (user_id, name, kind) values ($1, $2, $3) returning id, name, kind, created_at',
      [userId, safeName, safeKind]
    );
    return res.status(201).json({ category: created.rows[0] });
  } finally {
    client.release();
  }
}));

app.delete('/api/ledger/categories/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'delete from ledger_categories where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    return res.json({ ok: result.rowCount > 0 });
  } finally {
    client.release();
  }
}));

app.get('/api/ledger/entries', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const limit = clampLimit(req.query.limit, 50);
    const cursor = parseCursor(req.query.cursor);
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : null;

    const params = [userId];
    const clauses = ['user_id = $1'];
    if (from && !Number.isNaN(from.getTime())) {
      params.push(from.toISOString());
      clauses.push(`occurred_at >= $${params.length}`);
    }
    if (to && !Number.isNaN(to.getTime())) {
      params.push(to.toISOString());
      clauses.push(`occurred_at <= $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      clauses.push(`(title ilike $${params.length} or note ilike $${params.length})`);
    }
    if (categoryId) {
      params.push(categoryId);
      clauses.push(`category_id = $${params.length}`);
    }
    if (cursor) {
      params.push(cursor.occurredAt, cursor.id);
      clauses.push(`(occurred_at, id) < ($${params.length - 1}, $${params.length})`);
    }

    params.push(limit + 1);
    const sql = `
      select id, category_id, title, amount_num, amount_unit, occurred_at, note, created_at
      from ledger_entries
      where ${clauses.join(' and ')}
      order by occurred_at desc, id desc
      limit $${params.length}
    `;
    const result = await client.query(sql, params);
    const rows = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? buildCursor(rows[rows.length - 1]) : null;
    return res.json({ entries: rows, nextCursor });
  } finally {
    client.release();
  }
}));

app.post('/api/ledger/entries', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const payload = normalizeEntryPayload(req.body || {});
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const count = await client.query(
      'select count(*)::int as count from ledger_entries where user_id = $1',
      [userId]
    );
    if (count.rows[0].count >= MAX_ENTRIES) {
      return res.status(400).json({ error: 'Entry limit reached.' });
    }
    const created = await client.query(
      `insert into ledger_entries (user_id, category_id, title, amount_num, amount_unit, occurred_at, note)
       values ($1, $2, $3, $4, $5, coalesce($6, now()), $7)
       returning id, category_id, title, amount_num, amount_unit, occurred_at, note, created_at`,
      [
        userId,
        payload.categoryId,
        payload.title,
        payload.amountNum,
        payload.amountUnit,
        payload.occurredAt ? payload.occurredAt.toISOString() : null,
        payload.note
      ]
    );
    return res.status(201).json({ entry: created.rows[0] });
  } finally {
    client.release();
  }
}));

app.patch('/api/ledger/entries/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const payload = normalizeEntryPayload(req.body || {});
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const updates = [];
    const values = [];
    if (payload.title !== '') {
      values.push(payload.title);
      updates.push(`title = $${values.length}`);
    }
    if (payload.categoryId !== null) {
      values.push(payload.categoryId);
      updates.push(`category_id = $${values.length}`);
    }
    if (payload.amountNum !== null) {
      values.push(payload.amountNum);
      updates.push(`amount_num = $${values.length}`);
    }
    if (payload.amountUnit !== '') {
      values.push(payload.amountUnit);
      updates.push(`amount_unit = $${values.length}`);
    }
    if (payload.occurredAt) {
      values.push(payload.occurredAt.toISOString());
      updates.push(`occurred_at = $${values.length}`);
    }
    if (payload.note !== '') {
      values.push(payload.note);
      updates.push(`note = $${values.length}`);
    }
    if (!updates.length) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    const idIndex = values.length + 1;
    const userIndex = values.length + 2;
    values.push(req.params.id, userId);
    const result = await client.query(
      `update ledger_entries
       set ${updates.join(', ')}
       where id = $${idIndex} and user_id = $${userIndex}
       returning id, category_id, title, amount_num, amount_unit, occurred_at, note, created_at`,
      values
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    return res.json({ entry: result.rows[0] });
  } finally {
    client.release();
  }
}));

app.delete('/api/ledger/entries/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'delete from ledger_entries where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    return res.json({ ok: result.rowCount > 0 });
  } finally {
    client.release();
  }
}));

app.get('/api/ledger/rollups', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const range = req.query.range === '30d' ? 30 : 7;
  const groupBy = req.query.groupBy === 'category' ? 'category' : 'day';
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const start = new Date();
    start.setDate(start.getDate() - range + 1);
    if (groupBy === 'category') {
      const result = await client.query(
        `select coalesce(c.name, 'Uncategorized') as label,
                count(e.id)::int as entry_count,
                coalesce(sum(e.amount_num), 0) as total_amount
         from ledger_entries e
         left join ledger_categories c on c.id = e.category_id
         where e.user_id = $1 and e.occurred_at >= $2
         group by label
         order by total_amount desc`,
        [userId, start.toISOString()]
      );
      return res.json({ range: `${range}d`, groupBy, rollups: result.rows });
    }

    const result = await client.query(
      `select date_trunc('day', occurred_at) as label,
              count(id)::int as entry_count,
              coalesce(sum(amount_num), 0) as total_amount
       from ledger_entries
       where user_id = $1 and occurred_at >= $2
       group by label
       order by label asc`,
      [userId, start.toISOString()]
    );
    return res.json({ range: `${range}d`, groupBy, rollups: result.rows });
  } finally {
    client.release();
  }
}));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((error, req, res, _next) => {
  const mapped = mapDbError(error);
  res.status(mapped.status).json({
    error: mapped.message,
    requestId: req.requestId
  });
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`PalmLedger API running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
