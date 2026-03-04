const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED,
});

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists sk_users (
      id uuid primary key default gen_random_uuid(),
      device_key text not null unique,
      created_at timestamptz not null default now()
    );

    create table if not exists sk_presets (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references sk_users(id) on delete cascade,
      name text not null,
      seconds int not null check (seconds > 0 and seconds <= 86400),
      sound_profile text not null default 'default',
      haptic_profile text not null default 'default',
      created_at timestamptz not null default now(),
      unique(user_id, name)
    );

    create table if not exists sk_timer_runs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references sk_users(id) on delete cascade,
      preset_id uuid null references sk_presets(id) on delete set null,
      label text not null default '',
      started_at timestamptz not null default now(),
      target_seconds int not null check (target_seconds > 0 and target_seconds <= 86400),
      ended_at timestamptz null,
      status text not null default 'running'
        check (status in ('running', 'done', 'canceled')),
      created_at timestamptz not null default now()
    );

    create index if not exists idx_sk_runs_user_time
      on sk_timer_runs(user_id, started_at desc);

    create index if not exists idx_sk_runs_user_status
      on sk_timer_runs(user_id, status);
  `);
  schemaReady = true;
}

async function ensureUser(deviceKey) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query(
      `insert into sk_users (device_key) values ($1)
       on conflict (device_key) do nothing`,
      [deviceKey],
    );
    const { rows } = await client.query(
      'select id from sk_users where device_key = $1',
      [deviceKey],
    );
    if (!rows[0]) throw new Error('user_missing');
    return rows[0].id;
  } finally {
    client.release();
  }
}

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey) {
    return res.status(400).json({ error: 'missing_device_key' });
  }
  req.deviceKey = deviceKey;
  next();
}

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'signal-kitchen-api' });
  });

  app.use('/api/sk', requireDeviceKey);

  app.get('/api/sk/presets', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      `select id, name, seconds, sound_profile, haptic_profile, created_at
       from sk_presets
       where user_id = $1
       order by created_at desc`,
      [userId]
    );
    res.json({ presets: rows });
  } catch (err) {
    console.error('sk_presets_fetch_failed', err);
    res.status(500).json({ error: 'presets_fetch_failed' });
  }
  });

  app.post('/api/sk/presets', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const { name, seconds, soundProfile, hapticProfile } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'invalid_name' });
    }
    const duration = Number(seconds);
    if (!Number.isFinite(duration) || duration < 1 || duration > 86400) {
      return res.status(400).json({ error: 'invalid_seconds' });
    }

    const { rows: countRows } = await pool.query(
      'select count(*)::int as count from sk_presets where user_id = $1',
      [userId]
    );
    if (countRows[0].count >= 200) {
      return res.status(400).json({ error: 'preset_limit_reached' });
    }

    const { rows } = await pool.query(
      `insert into sk_presets (user_id, name, seconds, sound_profile, haptic_profile)
       values ($1, $2, $3, $4, $5)
       returning id, name, seconds, sound_profile, haptic_profile, created_at`,
      [
        userId,
        name.trim(),
        duration,
        soundProfile || 'default',
        hapticProfile || 'default',
      ]
    );
    res.status(201).json({ preset: rows[0] });
  } catch (err) {
    if (String(err).includes('unique')) {
      return res.status(409).json({ error: 'preset_name_taken' });
    }
    res.status(500).json({ error: 'preset_create_failed' });
  }
  });

  app.delete('/api/sk/presets/:id', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'delete from sk_presets where id = $1 and user_id = $2',
      [id, userId]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'preset_not_found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'preset_delete_failed' });
  }
  });

  app.patch('/api/sk/presets/:id', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const { id } = req.params;
    const { name, seconds, soundProfile, hapticProfile } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'invalid_name' });
    }
    const duration = Number(seconds);
    if (!Number.isFinite(duration) || duration < 1 || duration > 86400) {
      return res.status(400).json({ error: 'invalid_seconds' });
    }

    const { rows } = await pool.query(
      `update sk_presets
       set name = $1,
           seconds = $2,
           sound_profile = $3,
           haptic_profile = $4
       where id = $5 and user_id = $6
       returning id, name, seconds, sound_profile, haptic_profile, created_at`,
      [
        name.trim(),
        duration,
        soundProfile || 'default',
        hapticProfile || 'default',
        id,
        userId,
      ]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'preset_not_found' });
    }
    res.json({ preset: rows[0] });
  } catch (err) {
    if (String(err).includes('unique')) {
      return res.status(409).json({ error: 'preset_name_taken' });
    }
    res.status(500).json({ error: 'preset_update_failed' });
  }
  });

  app.get('/api/sk/runs', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const status = req.query.status;
    const limit = Math.min(Number(req.query.limit) || 50, 50);
    const params = [userId];
    let where = 'user_id = $1';
    if (status === 'running' || status === 'done') {
      params.push(status);
      where += ` and status = $${params.length}`;
    }
    const { rows } = await pool.query(
      `select id, preset_id, label, started_at, target_seconds, ended_at, status
       from sk_timer_runs
       where ${where}
       order by started_at desc
       limit ${limit}`,
      params
    );
    res.json({ runs: rows });
  } catch (err) {
    console.error('sk_runs_fetch_failed', err);
    res.status(500).json({ error: 'runs_fetch_failed' });
  }
  });

  app.post('/api/sk/runs', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const { presetId, label, targetSeconds } = req.body || {};

    const { rows: runningRows } = await pool.query(
      "select count(*)::int as count from sk_timer_runs where user_id = $1 and status = 'running'",
      [userId]
    );
    if (runningRows[0].count >= 12) {
      return res.status(400).json({ error: 'running_limit_reached' });
    }

    let seconds = Number(targetSeconds);
    let preset = null;
    if ((!Number.isFinite(seconds) || seconds <= 0) && presetId) {
      const presetRes = await pool.query(
        'select id, seconds from sk_presets where id = $1 and user_id = $2',
        [presetId, userId]
      );
      preset = presetRes.rows[0] || null;
      if (preset) {
        seconds = preset.seconds;
      }
    }
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400) {
      return res.status(400).json({ error: 'invalid_target_seconds' });
    }

    const safeLabel =
      typeof label === 'string' ? label.trim().slice(0, 80) : '';

    const { rows } = await pool.query(
      `insert into sk_timer_runs (user_id, preset_id, label, target_seconds)
       values ($1, $2, $3, $4)
       returning id, preset_id, label, started_at, target_seconds, ended_at, status`,
      [userId, preset ? preset.id : presetId || null, safeLabel, seconds]
    );
    res.status(201).json({ run: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'run_create_failed' });
  }
  });

  app.patch('/api/sk/runs/:id/stop', async (req, res) => {
  try {
    const userId = await ensureUser(req.deviceKey);
    const { id } = req.params;
    const { status, endedAt } = req.body || {};
    if (status !== 'done' && status !== 'canceled') {
      return res.status(400).json({ error: 'invalid_status' });
    }
    const endedAtValue = endedAt ? new Date(endedAt) : new Date();
    if (Number.isNaN(endedAtValue.getTime())) {
      return res.status(400).json({ error: 'invalid_ended_at' });
    }

    const { rows } = await pool.query(
      `update sk_timer_runs
       set status = $1, ended_at = $2
       where id = $3 and user_id = $4 and status = 'running'
       returning id, preset_id, label, started_at, target_seconds, ended_at, status`,
      [status, endedAtValue, id, userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'run_not_found' });
    }
    res.json({ run: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'run_stop_failed' });
  }
  });

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 4002;
  app.listen(port, () => {
    console.log(`Signal Kitchen API listening on ${port}`);
  });
}
