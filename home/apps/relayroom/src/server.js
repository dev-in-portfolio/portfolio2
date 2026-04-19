const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3122);
const DATABASE_URL =
  process.env.RELAYROOM_DATABASE_URL ||
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
app.use(express.static(path.join(__dirname, '..', 'public')));
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
    `insert into rr_users (device_key)
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

function inviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/api/health/db', async (_req, res) => {
  if (!pool) return res.json({ ok: false, error: 'DATABASE_URL not configured' });
  try {
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use('/api/relayroom', requireDeviceKey);

app.get('/api/relayroom/rooms', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select r.id, r.name, r.invite_code, r.created_at,
              (select count(*)::int from rr_room_members m where m.room_id = r.id) as members
       from rr_rooms r
       join rr_room_members m on m.room_id = r.id
       where m.user_id = $1
       order by r.created_at desc`,
      [userId]
    );
    res.json({ rooms: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/relayroom/rooms', async (req, res, next) => {
  const client = await pool.connect();
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const name = String(req.body.name || '').trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: 'name required' });
    await client.query('begin');
    const room = await client.query(
      'insert into rr_rooms (owner_id, name, invite_code) values ($1, $2, $3) returning id, name, invite_code, created_at',
      [userId, name, inviteCode()]
    );
    await client.query(
      'insert into rr_room_members (room_id, user_id, role) values ($1, $2, $3)',
      [room.rows[0].id, userId, 'owner']
    );
    await client.query('commit');
    res.status(201).json({ room: room.rows[0] });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/relayroom/join', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const code = String(req.body.inviteCode || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'inviteCode required' });
    const room = await pool.query('select id, name, invite_code, created_at from rr_rooms where invite_code = $1 limit 1', [code]);
    if (!room.rows[0]) return res.status(404).json({ error: 'room not found' });
    await pool.query(
      `insert into rr_room_members (room_id, user_id, role) values ($1, $2, 'member')
       on conflict (room_id, user_id) do nothing`,
      [room.rows[0].id, userId]
    );
    res.json({ room: room.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/relayroom/rooms/:id/notes', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const allowed = await pool.query('select 1 from rr_room_members where room_id = $1 and user_id = $2', [req.params.id, userId]);
    if (!allowed.rows[0]) return res.status(403).json({ error: 'not a member' });
    const { rows } = await pool.query(
      `select id, title, body, created_at from rr_room_notes where room_id = $1 order by created_at desc limit 200`,
      [req.params.id]
    );
    res.json({ notes: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/relayroom/rooms/:id/notes', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const allowed = await pool.query('select 1 from rr_room_members where room_id = $1 and user_id = $2', [req.params.id, userId]);
    if (!allowed.rows[0]) return res.status(403).json({ error: 'not a member' });
    const title = String(req.body.title || '').slice(0, 120);
    const body = String(req.body.body || '').slice(0, 5000);
    if (!body) return res.status(400).json({ error: 'body required' });
    const { rows } = await pool.query(
      `insert into rr_room_notes (room_id, user_id, title, body)
       values ($1, $2, $3, $4)
       returning id, title, body, created_at`,
      [req.params.id, userId, title, body]
    );
    res.status(201).json({ note: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`relayroom listening on ${PORT}`));

module.exports = app;
