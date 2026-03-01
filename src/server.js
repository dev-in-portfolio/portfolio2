require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3015);
const DATABASE_URL = process.env.DATABASE_URL || '';

const MAX_DECKS = 500;
const MAX_CARDS_PER_DECK = 50000;
const MAX_TEXT = 10000;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 24;
const MAX_NAME = 80;
const MAX_DESC = 400;

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
app.use(express.json({ limit: '200kb' }));
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
    return { status: 500, message: 'Database schema missing. Run sql/001_cuedeck.sql.' };
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

function clampLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function normalizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  const trimmed = raw
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean);
  return Array.from(new Set(trimmed)).slice(0, MAX_TAGS);
}

function parseCursor(cursor) {
  if (!cursor) return null;
  const [dueAt, id] = cursor.split('|');
  if (!dueAt || !id) return null;
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return { dueAt: parsed.toISOString(), id };
}

function buildCursor(row) {
  return `${row.due_at.toISOString()}|${row.id}`;
}

function scheduleNext(card, rating) {
  let ease = Number(card.ease);
  let interval = Number(card.interval_days);
  const now = new Date();
  if (!Number.isFinite(ease)) ease = 2.5;
  if (!Number.isFinite(interval)) interval = 0;

  if (rating === 'again') {
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    const dueAt = new Date(now.getTime() + 5 * 60 * 1000);
    return { ease, interval, dueAt };
  }
  if (rating === 'hard') {
    interval = Math.max(1, Math.floor(interval * 1.2));
    ease = Math.max(1.3, ease - 0.05);
    const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    return { ease, interval, dueAt };
  }
  if (rating === 'good') {
    interval = interval === 0 ? 1 : Math.max(1, Math.floor(interval * ease));
    const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    return { ease, interval, dueAt };
  }
  if (rating === 'easy') {
    interval =
      interval === 0 ? 3 : Math.max(1, Math.floor(interval * ease * 1.3));
    ease = Math.min(3.0, ease + 0.05);
    const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    return { ease, interval, dueAt };
  }
  return { ease, interval, dueAt: now };
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CueDeck API</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
    }
    body {
      margin: 0;
      background: radial-gradient(circle at top, #e0f2fe 0%, #fef3c7 35%, #f1f5f9 100%);
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
    <span class="pill">CueDeck API · Online</span>
    <h1>Smart queues for spaced repetition.</h1>
    <p class="tagline">
      CueDeck is a flashcard engine with deterministic scheduling. Every request includes
      <code>X-Device-Key</code> and uses Neon Postgres for persistence.
    </p>
    <div class="grid">
      <div class="card">
        <h3>Health</h3>
        <p>Check backend readiness and DB wiring.</p>
        <code>GET /api/cuedeck/health</code>
      </div>
      <div class="card">
        <h3>Status</h3>
        <p>Counts for decks, cards, due queue.</p>
        <code>GET /api/cuedeck/status</code>
      </div>
      <div class="card">
        <h3>Decks</h3>
        <p>Create and organize deck collections.</p>
        <code>GET /api/cuedeck/decks</code>
      </div>
      <div class="card">
        <h3>Review Queue</h3>
        <p>Pull due cards and submit ratings.</p>
        <code>GET /api/cuedeck/queue</code>
      </div>
    </div>
    <div class="card" style="margin-top: 24px;">
      <h3>Example Request</h3>
      <p>Every request includes a device key header.</p>
      <code>curl -H "X-Device-Key: demo-device" http://127.0.0.1:3015/api/cuedeck/health</code>
    </div>
  </div>
  <div class="footer">CueDeck backend is ready for your mobile client.</div>
</body>
</html>`);
});

app.get('/api/cuedeck/health', asyncHandler(async (_req, res) => {
  if (!pool) return res.status(500).json({ ok: false, error: 'DATABASE_URL is not set.' });
  const result = await pool.query('select now() as now');
  return res.json({
    ok: true,
    dbTime: result.rows[0].now,
    uptimeSeconds: Math.round(process.uptime()),
    version: 'v1'
  });
}));

app.use('/api/cuedeck', requireDeviceKey);

app.get('/api/cuedeck/status', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const [counts, due] = await Promise.all([
      client.query(
        `select
          (select count(*) from decks where user_id = $1)::int as deck_count,
          (select count(*) from cards where user_id = $1)::int as card_count`,
        [userId]
      ),
      client.query(
        `select count(*)::int as due_count
         from cards
         where user_id = $1 and due_at <= now()`,
        [userId]
      )
    ]);
    return res.json({
      decks: counts.rows[0].deck_count,
      cards: counts.rows[0].card_count,
      due: due.rows[0].due_count
    });
  } finally {
    client.release();
  }
}));

app.get('/api/cuedeck/decks', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      `select d.id, d.name, d.description, d.created_at,
              (select count(*)::int from cards c where c.deck_id = d.id) as card_count,
              (select count(*)::int from cards c where c.deck_id = d.id and c.due_at <= now()) as due_count
       from decks d
       where d.user_id = $1
       order by d.created_at desc`,
      [userId]
    );
    return res.json({ decks: result.rows });
  } finally {
    client.release();
  }
}));

app.post('/api/cuedeck/decks', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, MAX_NAME) : '';
  const description =
    typeof req.body?.description === 'string'
      ? req.body.description.trim().slice(0, MAX_DESC)
      : '';
  if (!name) return res.status(400).json({ error: 'name is required.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const count = await client.query(
      'select count(*)::int as count from decks where user_id = $1',
      [userId]
    );
    if (count.rows[0].count >= MAX_DECKS) {
      return res.status(400).json({ error: 'Deck limit reached.' });
    }
    const created = await client.query(
      `insert into decks (user_id, name, description)
       values ($1, $2, $3)
       returning id, name, description, created_at`,
      [userId, name, description]
    );
    return res.status(201).json({ deck: created.rows[0] });
  } finally {
    client.release();
  }
}));

app.delete('/api/cuedeck/decks/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'delete from decks where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    return res.json({ ok: result.rowCount > 0 });
  } finally {
    client.release();
  }
}));

app.get('/api/cuedeck/cards', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const deckId = typeof req.query.deckId === 'string' ? req.query.deckId : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
    const dueOnly = req.query.dueOnly === 'true';
    const limit = clampLimit(req.query.limit, 50);
    const cursor = parseCursor(req.query.cursor);

    const params = [userId];
    const clauses = ['user_id = $1'];
    if (deckId) {
      params.push(deckId);
      clauses.push(`deck_id = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      clauses.push(`(front ilike $${params.length} or back ilike $${params.length})`);
    }
    if (tag) {
      params.push(tag);
      clauses.push(`$${params.length} = any(tags)`);
    }
    if (dueOnly) {
      clauses.push('due_at <= now()');
    }
    if (cursor) {
      params.push(cursor.dueAt, cursor.id);
      clauses.push(`(due_at, id) > ($${params.length - 1}, $${params.length})`);
    }

    params.push(limit + 1);
    const result = await client.query(
      `select id, deck_id, front, back, tags, ease, interval_days, due_at, last_reviewed_at, created_at, updated_at
       from cards
       where ${clauses.join(' and ')}
       order by due_at asc, id asc
       limit $${params.length}`,
      params
    );
    const rows = result.rows.slice(0, limit);
    const nextCursor = result.rows.length > limit ? buildCursor(rows[rows.length - 1]) : null;
    return res.json({ cards: rows, nextCursor });
  } finally {
    client.release();
  }
}));

app.post('/api/cuedeck/cards', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const deckId = typeof req.body?.deckId === 'string' ? req.body.deckId : null;
  const front = typeof req.body?.front === 'string' ? req.body.front.trim().slice(0, MAX_TEXT) : '';
  const back = typeof req.body?.back === 'string' ? req.body.back.trim().slice(0, MAX_TEXT) : '';
  const tags = normalizeTags(req.body?.tags);
  if (!deckId) return res.status(400).json({ error: 'deckId is required.' });
  if (!front || !back) return res.status(400).json({ error: 'front and back are required.' });

  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const count = await client.query(
      'select count(*)::int as count from cards where user_id = $1 and deck_id = $2',
      [userId, deckId]
    );
    if (count.rows[0].count >= MAX_CARDS_PER_DECK) {
      return res.status(400).json({ error: 'Deck card limit reached.' });
    }
    const created = await client.query(
      `insert into cards (user_id, deck_id, front, back, tags)
       values ($1, $2, $3, $4, $5)
       returning id, deck_id, front, back, tags, ease, interval_days, due_at, last_reviewed_at, created_at, updated_at`,
      [userId, deckId, front, back, tags]
    );
    return res.status(201).json({ card: created.rows[0] });
  } finally {
    client.release();
  }
}));

app.patch('/api/cuedeck/cards/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const updates = [];
  const values = [];
  if (typeof req.body?.front === 'string') {
    const front = req.body.front.trim().slice(0, MAX_TEXT);
    if (!front) return res.status(400).json({ error: 'front cannot be empty.' });
    values.push(front);
    updates.push(`front = $${values.length}`);
  }
  if (typeof req.body?.back === 'string') {
    const back = req.body.back.trim().slice(0, MAX_TEXT);
    if (!back) return res.status(400).json({ error: 'back cannot be empty.' });
    values.push(back);
    updates.push(`back = $${values.length}`);
  }
  if (Array.isArray(req.body?.tags)) {
    const tags = normalizeTags(req.body.tags);
    values.push(tags);
    updates.push(`tags = $${values.length}`);
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });

  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const idIndex = values.length + 1;
    const userIndex = values.length + 2;
    values.push(req.params.id, userId);
    const result = await client.query(
      `update cards
       set ${updates.join(', ')}
       where id = $${idIndex} and user_id = $${userIndex}
       returning id, deck_id, front, back, tags, ease, interval_days, due_at, last_reviewed_at, created_at, updated_at`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found.' });
    return res.json({ card: result.rows[0] });
  } finally {
    client.release();
  }
}));

app.delete('/api/cuedeck/cards/:id', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const result = await client.query(
      'delete from cards where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    return res.json({ ok: result.rowCount > 0 });
  } finally {
    client.release();
  }
}));

app.get('/api/cuedeck/queue', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const deckId = typeof req.query.deckId === 'string' ? req.query.deckId : null;
  const limit = clampLimit(req.query.limit, 25);
  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const params = [userId];
    let clause = 'where user_id = $1 and due_at <= now()';
    if (deckId) {
      params.push(deckId);
      clause += ` and deck_id = $${params.length}`;
    }
    params.push(limit);
    const result = await client.query(
      `select id, deck_id, front, back, tags, ease, interval_days, due_at, last_reviewed_at
       from cards
       ${clause}
       order by due_at asc, id asc
       limit $${params.length}`,
      params
    );
    return res.json({ queue: result.rows });
  } finally {
    client.release();
  }
}));

app.post('/api/cuedeck/review', asyncHandler(async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'DATABASE_URL is not set.' });
  const cardId = typeof req.body?.cardId === 'string' ? req.body.cardId : null;
  const rating = typeof req.body?.rating === 'string' ? req.body.rating : null;
  const allowed = ['again', 'hard', 'good', 'easy'];
  if (!cardId) return res.status(400).json({ error: 'cardId is required.' });
  if (!allowed.includes(rating)) return res.status(400).json({ error: 'Invalid rating.' });

  const client = await pool.connect();
  try {
    const userId = await getOrCreateUser(client, req.deviceKey);
    const cardResult = await client.query(
      `select id, deck_id, ease, interval_days, due_at
       from cards
       where id = $1 and user_id = $2`,
      [cardId, userId]
    );
    if (!cardResult.rows.length) return res.status(404).json({ error: 'Card not found.' });

    const card = cardResult.rows[0];
    const schedule = scheduleNext(card, rating);
    const updated = await client.query(
      `update cards
       set ease = $1,
           interval_days = $2,
           due_at = $3,
           last_reviewed_at = now()
       where id = $4 and user_id = $5
       returning id, deck_id, front, back, tags, ease, interval_days, due_at, last_reviewed_at`,
      [schedule.ease, schedule.interval, schedule.dueAt.toISOString(), cardId, userId]
    );
    await client.query(
      `insert into reviews (user_id, card_id, deck_id, rating, prev_due_at, next_due_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        cardId,
        card.deck_id,
        rating,
        card.due_at,
        schedule.dueAt.toISOString()
      ]
    );
    return res.json({ card: updated.rows[0], nextDueAt: schedule.dueAt });
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
  console.log(`CueDeck API running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
