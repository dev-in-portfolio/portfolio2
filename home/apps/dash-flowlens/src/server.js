const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3132);
const DATABASE_URL =
  process.env.DASH_FLOWLENS_DATABASE_URL ||
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
  if (req.url === fnPrefix) req.url = '/';
  else if (req.url.startsWith(`${fnPrefix}/`)) req.url = req.url.slice(fnPrefix.length);
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

function requireDb() {
  if (!pool) {
    const err = new Error('DATABASE_URL not configured');
    err.status = 500;
    throw err;
  }
}

function requireDeviceKey(req, res, next) {
  const key = req.header('X-Device-Key');
  if (!key) return res.status(400).json({ error: 'Missing X-Device-Key header' });
  req.deviceKey = key;
  next();
}

async function ensureUser(deviceKey) {
  await pool.query('insert into dfl_users(device_key) values ($1) on conflict do nothing', [deviceKey]);
  const row = await pool.query('select id from dfl_users where device_key = $1', [deviceKey]);
  return row.rows[0].id;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health/db', async (_req, res) => {
  if (!pool) return res.json({ ok: false, error: 'DATABASE_URL not configured' });
  try {
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/flowlens/events', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const days = Math.min(180, Math.max(1, Number(req.query.days || 30)));
    const stage = String(req.query.stage || '').trim();
    const params = [userId, days];
    let sql = `
      select id, entity_id, stage, entered_at, exited_at, metadata
      from dfl_flow_events
      where user_id = $1 and entered_at >= now() - ($2 || ' days')::interval
    `;
    if (stage) {
      params.push(stage);
      sql += ` and stage = $${params.length}`;
    }
    sql += ' order by entered_at desc limit 500';
    const { rows } = await pool.query(sql, params);
    res.json({ events: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/flowlens/events', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const entityId = String(req.body.entity_id || '').trim();
    const stage = String(req.body.stage || '').trim();
    const enteredAt = req.body.entered_at ? new Date(req.body.entered_at) : new Date();
    const exitedAt = req.body.exited_at ? new Date(req.body.exited_at) : null;
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    if (!entityId || !stage) return res.status(400).json({ error: 'entity_id and stage required' });
    const { rows } = await pool.query(
      `insert into dfl_flow_events (user_id, entity_id, stage, entered_at, exited_at, metadata)
       values ($1, $2, $3, $4, $5, $6)
       returning id, entity_id, stage, entered_at, exited_at, metadata`,
      [userId, entityId, stage, enteredAt, exitedAt, metadata]
    );
    res.status(201).json({ event: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/flowlens/summary', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const days = Math.min(180, Math.max(1, Number(req.query.days || 30)));
    const { rows } = await pool.query(
      `select entity_id, stage, entered_at, exited_at
       from dfl_flow_events
       where user_id = $1 and entered_at >= now() - ($2 || ' days')::interval
       order by entity_id, entered_at asc`,
      [userId, days]
    );

    const throughput = {};
    const dwellSums = {};
    const dwellCounts = {};
    const transitions = {};
    const perEntity = new Map();

    for (const row of rows) {
      throughput[row.stage] = (throughput[row.stage] || 0) + 1;
      if (row.exited_at) {
        const dwell = (new Date(row.exited_at).getTime() - new Date(row.entered_at).getTime()) / 60000;
        if (Number.isFinite(dwell) && dwell >= 0) {
          dwellSums[row.stage] = (dwellSums[row.stage] || 0) + dwell;
          dwellCounts[row.stage] = (dwellCounts[row.stage] || 0) + 1;
        }
      }
      if (!perEntity.has(row.entity_id)) perEntity.set(row.entity_id, []);
      perEntity.get(row.entity_id).push(row.stage);
    }

    for (const stages of perEntity.values()) {
      for (let i = 0; i < stages.length - 1; i++) {
        const key = `${stages[i]}->${stages[i + 1]}`;
        transitions[key] = (transitions[key] || 0) + 1;
      }
    }

    const dwell = Object.keys(dwellSums)
      .sort()
      .map((stage) => ({ stage, avg_minutes: Number((dwellSums[stage] / Math.max(1, dwellCounts[stage])).toFixed(2)) }));

    const transitionRows = Object.entries(transitions).map(([key, count]) => {
      const [from, to] = key.split('->');
      return { from, to, count };
    });

    const dropoffBase = {};
    for (const t of transitionRows) dropoffBase[t.from] = (dropoffBase[t.from] || 0) + t.count;
    const dropoff = transitionRows.map((t) => ({
      stage: t.from,
      next_stage: t.to,
      completion_rate: Number((t.count / Math.max(1, dropoffBase[t.from])).toFixed(2))
    }));

    res.json({
      throughput: Object.entries(throughput).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count),
      dwell,
      transitions: transitionRows.sort((a, b) => b.count - a.count),
      dropoff: dropoff.sort((a, b) => a.stage.localeCompare(b.stage))
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`dash-flowlens listening on ${PORT}`));

module.exports = app;
