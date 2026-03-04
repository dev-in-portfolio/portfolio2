const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3128);
const DATABASE_URL =
  process.env.TAPFORGE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      max: 5
    })
  : null;

app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) req.url = '/';
  else if (req.url.startsWith(`${fnPrefix}/`)) req.url = req.url.slice(fnPrefix.length);
  next();
});

function requireDb() {
  if (!pool) {
    const err = new Error('DATABASE_URL not configured');
    err.status = 500;
    throw err;
  }
}

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey || deviceKey.length < 8) {
    return res.status(401).json({ error: 'Missing device key.' });
  }
  req.deviceKey = deviceKey;
  next();
}

async function ensureUser(deviceKey) {
  await pool.query('insert into tf_users(device_key) values ($1) on conflict do nothing', [deviceKey]);
  const result = await pool.query('select id from tf_users where device_key = $1', [deviceKey]);
  return result.rows[0].id;
}

function validateSettings(settings) {
  if (!settings || settings.version !== 1) return 'settings.version must be 1';
  if (!Array.isArray(settings.controls) || settings.controls.length < 1 || settings.controls.length > 32) {
    return 'controls length must be 1..32';
  }
  const ids = new Set();
  for (const control of settings.controls) {
    if (!control.id || control.id.length < 1 || control.id.length > 32) return 'invalid control id';
    if (ids.has(control.id)) return 'control id must be unique';
    ids.add(control.id);

    if (!['slider', 'toggle', 'segmented'].includes(control.type)) return 'invalid control type';

    if (control.type === 'slider') {
      const min = Number(control.min);
      const max = Number(control.max);
      const step = Number(control.step);
      const value = Number(control.value);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return 'invalid slider bounds';
      if (!Number.isFinite(step) || step <= 0) return 'invalid slider step';
      if (!Number.isFinite(value) || value < min || value > max) return 'invalid slider value';
    }

    if (control.type === 'toggle') {
      if (typeof control.value !== 'boolean') return 'toggle value must be boolean';
    }

    if (control.type === 'segmented') {
      if (!Array.isArray(control.options) || control.options.length < 1) return 'segmented options required';
      if (!control.options.includes(control.value)) return 'segmented value must be in options';
    }
  }
  return null;
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

const router = express.Router();
router.use(requireDeviceKey);

router.get('/presets', async (req, res) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const result = await pool.query(
      'select id, name, settings, created_at, updated_at from tf_presets where user_id = $1 order by updated_at desc',
      [userId]
    );
    return res.json(result.rows);
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to list presets.' });
  }
});

router.post('/presets', async (req, res) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { name, settings } = req.body;
    if (!name || name.length < 1 || name.length > 80) {
      return res.status(400).json({ error: 'Name must be 1-80 chars.' });
    }
    const settingsError = validateSettings(settings);
    if (settingsError) return res.status(400).json({ error: settingsError });

    const countRes = await pool.query('select count(*) from tf_presets where user_id = $1', [userId]);
    if (Number(countRes.rows[0].count) >= 500) {
      return res.status(400).json({ error: 'Preset limit reached.' });
    }

    const result = await pool.query(
      'insert into tf_presets(user_id, name, settings) values ($1,$2,$3) returning *',
      [userId, name, settings]
    );
    return res.status(201).json(result.rows[0]);
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to create preset.' });
  }
});

router.patch('/presets/:id', async (req, res) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { name, settings } = req.body;
    if (name && (name.length < 1 || name.length > 80)) {
      return res.status(400).json({ error: 'Name must be 1-80 chars.' });
    }
    if (settings) {
      const settingsError = validateSettings(settings);
      if (settingsError) return res.status(400).json({ error: settingsError });
    }

    const existing = await pool.query('select * from tf_presets where id = $1 and user_id = $2', [req.params.id, userId]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Not found.' });

    const updated = await pool.query(
      'update tf_presets set name = $1, settings = $2 where id = $3 returning *',
      [name ?? existing.rows[0].name, settings ?? existing.rows[0].settings, req.params.id]
    );
    return res.json(updated.rows[0]);
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to update preset.' });
  }
});

router.post('/presets/:id/duplicate', async (req, res) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const existing = await pool.query('select * from tf_presets where id = $1 and user_id = $2', [req.params.id, userId]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Not found.' });
    const preset = existing.rows[0];
    const result = await pool.query('insert into tf_presets(user_id, name, settings) values ($1, $2, $3) returning *', [
      userId,
      `${preset.name} Copy`,
      preset.settings
    ]);
    return res.json(result.rows[0]);
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to duplicate preset.' });
  }
});

router.delete('/presets/:id', async (req, res) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const result = await pool.query('delete from tf_presets where id = $1 and user_id = $2', [req.params.id, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found.' });
    return res.json({ ok: true });
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to delete preset.' });
  }
});

app.use('/api/tapforge', router);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`tapforge listening on ${PORT}`));

module.exports = app;
