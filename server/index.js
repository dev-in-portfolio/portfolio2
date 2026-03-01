import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';
const PORT = process.env.PORT || 3012;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. API will fail until configured.');
}

const pool = new Pool({ connectionString: DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json({ limit: '128kb' }));

const MAX_SIGNALS = 5000;
const MAX_NOTE = 2000;
const MAX_NAME = 80;

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
  if (!deviceKey) {
    return res.status(400).json({ error: 'Missing X-Device-Key header' });
  }
  req.deviceKey = deviceKey;
  next();
}

function evaluateStatus(valueNum, rule, manualStatus) {
  if (valueNum == null || !rule) {
    return manualStatus || 'ok';
  }
  const value = Number(valueNum);
  if (rule.bad_if_gt != null && value > Number(rule.bad_if_gt)) return 'bad';
  if (rule.bad_if_lt != null && value < Number(rule.bad_if_lt)) return 'bad';
  if (rule.warn_if_gt != null && value > Number(rule.warn_if_gt)) return 'warn';
  if (rule.warn_if_lt != null && value < Number(rule.warn_if_lt)) return 'warn';
  return 'ok';
}

app.get('/api/signalboard/signals', requireDeviceKey, async (req, res) => {
  try {
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select id, name, kind, status, note, value_num, value_unit, updated_at, created_at
       from signals
       where user_id = $1
       order by updated_at desc`,
      [userId]
    );
    res.json({ signals: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/signalboard/signals', requireDeviceKey, async (req, res) => {
  try {
    const { name, kind = 'generic', note = '', valueNum = null, valueUnit = '' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (name.length > MAX_NAME) return res.status(400).json({ error: 'name too long' });
    if (note.length > MAX_NOTE) return res.status(400).json({ error: 'note too long' });

    const userId = await getUserId(req.deviceKey);
    const { rows: countRows } = await pool.query(
      'select count(*)::int as count from signals where user_id = $1',
      [userId]
    );
    if (countRows[0].count >= MAX_SIGNALS) {
      return res.status(400).json({ error: 'signal limit reached' });
    }

    const { rows } = await pool.query(
      `insert into signals (user_id, name, kind, note, value_num, value_unit)
       values ($1, $2, $3, $4, $5, $6)
       returning id, name, kind, status, note, value_num, value_unit, updated_at, created_at`,
      [userId, name, kind, note, valueNum, valueUnit]
    );
    res.json({ signal: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.patch('/api/signalboard/signals/:id', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { note, valueNum, valueUnit, status } = req.body || {};
    if (note && note.length > MAX_NOTE) return res.status(400).json({ error: 'note too long' });

    const userId = await getUserId(req.deviceKey);
    const { rows: ruleRows } = await pool.query(
      'select warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt from signal_rules where user_id = $1 and signal_id = $2',
      [userId, id]
    );
    const rule = ruleRows[0] || null;
    const computedStatus = evaluateStatus(valueNum, rule, status);

    const { rows } = await pool.query(
      `update signals
       set note = coalesce($1, note),
           value_num = coalesce($2, value_num),
           value_unit = coalesce($3, value_unit),
           status = $4,
           updated_at = now()
       where id = $5 and user_id = $6
       returning id, name, kind, status, note, value_num, value_unit, updated_at, created_at`,
      [note || null, valueNum ?? null, valueUnit || null, computedStatus, id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'signal not found' });
    res.json({ signal: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/signalboard/signals/:id', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req.deviceKey);
    const { rowCount } = await pool.query('delete from signals where id = $1 and user_id = $2', [id, userId]);
    if (!rowCount) return res.status(404).json({ error: 'signal not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/signalboard/signals/:id/rule', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      'select warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt from signal_rules where user_id = $1 and signal_id = $2',
      [userId, id]
    );
    res.json({ rule: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/signalboard/signals/:id/rule', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { warnIfGt = null, warnIfLt = null, badIfGt = null, badIfLt = null } = req.body || {};
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `insert into signal_rules (user_id, signal_id, warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, signal_id)
       do update set warn_if_gt = excluded.warn_if_gt,
                     warn_if_lt = excluded.warn_if_lt,
                     bad_if_gt = excluded.bad_if_gt,
                     bad_if_lt = excluded.bad_if_lt
       returning warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt`,
      [userId, id, warnIfGt, warnIfLt, badIfGt, badIfLt]
    );
    res.json({ rule: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/signalboard/signals/:id/rule', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req.deviceKey);
    await pool.query('delete from signal_rules where user_id = $1 and signal_id = $2', [userId, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/signalboard/board', requireDeviceKey, async (req, res) => {
  try {
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select id, name, kind, status, note, value_num, value_unit, updated_at, created_at
       from signals
       where user_id = $1
       order by case status when 'bad' then 1 when 'warn' then 2 else 3 end,
                updated_at desc`,
      [userId]
    );
    res.json({ signals: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`Signal Board API running on port ${PORT}`);
});

module.exports = app;
