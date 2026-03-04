const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3131);
const DATABASE_URL =
  process.env.RULE_FURNACE_DATABASE_URL ||
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

const OPERATORS = ['==', '!=', '>=', '<=', '>', '<', 'in', 'contains'];

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function parseLiteral(raw) {
  const trimmed = String(raw).trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (!Number.isNaN(Number(trimmed))) return Number(trimmed);
  if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
    return JSON.parse(trimmed);
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

function evalClause(left, op, right, data) {
  if (op === 'exists') return getValueByPath(data, left) !== undefined;
  const leftValue = getValueByPath(data, left);
  const rightValue = parseLiteral(right);
  switch (op) {
    case '==': return leftValue === rightValue;
    case '!=': return leftValue !== rightValue;
    case '>': return Number(leftValue) > Number(rightValue);
    case '<': return Number(leftValue) < Number(rightValue);
    case '>=': return Number(leftValue) >= Number(rightValue);
    case '<=': return Number(leftValue) <= Number(rightValue);
    case 'in': return Array.isArray(rightValue) ? rightValue.includes(leftValue) : false;
    case 'contains': return typeof leftValue === 'string' && typeof rightValue === 'string' ? leftValue.includes(rightValue) : false;
    default: return false;
  }
}

function evaluateExpression(expr, data) {
  const tokens = String(expr).split(/\s+(and|or)\s+/i);
  let result = false;
  let pendingOp = null;
  for (const token of tokens) {
    if (token.toLowerCase() === 'and' || token.toLowerCase() === 'or') {
      pendingOp = token.toLowerCase();
      continue;
    }
    const clause = token.trim();
    if (!clause) continue;

    let clauseResult = false;
    if (clause.startsWith('exists(')) {
      const field = clause.slice(7, -1);
      clauseResult = evalClause(field, 'exists', '', data);
    } else {
      const op = OPERATORS.find((operator) => clause.includes(` ${operator} `));
      if (op) {
        const [left, right] = clause.split(` ${op} `);
        clauseResult = evalClause(left.trim(), op, right.trim(), data);
      }
    }

    if (pendingOp === 'and') result = result && clauseResult;
    else if (pendingOp === 'or') result = result || clauseResult;
    else result = clauseResult;
  }
  return result;
}

app.use(cors());
app.use(express.json({ limit: '256kb' }));
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
  const key = req.header('X-Device-Key');
  if (!key) return res.status(400).json({ error: 'Missing X-Device-Key header' });
  req.deviceKey = key;
  next();
}

async function ensureUser(deviceKey) {
  await pool.query('insert into rf_users(device_key) values ($1) on conflict do nothing', [deviceKey]);
  const result = await pool.query('select id from rf_users where device_key = $1', [deviceKey]);
  return result.rows[0].id;
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

router.get('/rules', async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      'select id, name, priority, is_enabled, when_expr, then_json from rf_rules where user_id = $1 order by priority desc',
      [userId]
    );
    res.json({ rules: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/rules', async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const priority = Number(req.body.priority || 0);
    const whenExpr = typeof req.body.when_expr === 'string' ? req.body.when_expr.trim() : '';
    const thenJson = req.body.then_json && typeof req.body.then_json === 'object' ? req.body.then_json : {};
    const isEnabled = req.body.is_enabled === undefined ? true : Boolean(req.body.is_enabled);

    if (!name || !whenExpr) return res.status(400).json({ error: 'name and when_expr required' });
    if (whenExpr.length > 2000) return res.status(400).json({ error: 'when_expr too long' });
    if (JSON.stringify(thenJson).length > 32768) return res.status(400).json({ error: 'then_json too large' });

    const countRes = await pool.query('select count(*)::int as count from rf_rules where user_id = $1', [userId]);
    if ((countRes.rows[0]?.count || 0) >= 10000) return res.status(400).json({ error: 'rule limit reached' });

    const { rows } = await pool.query(
      `insert into rf_rules (user_id, name, priority, is_enabled, when_expr, then_json)
       values ($1, $2, $3, $4, $5, $6)
       returning id, name, priority, is_enabled, when_expr, then_json`,
      [userId, name, priority, isEnabled, whenExpr, thenJson]
    );
    res.status(201).json({ rule: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch('/rules/:id', async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const existing = await pool.query('select * from rf_rules where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'rule not found' });

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : existing.rows[0].name;
    const priority = req.body.priority != null ? Number(req.body.priority) : existing.rows[0].priority;
    const whenExpr = typeof req.body.when_expr === 'string' ? req.body.when_expr.trim() : existing.rows[0].when_expr;
    const thenJson = req.body.then_json && typeof req.body.then_json === 'object' ? req.body.then_json : existing.rows[0].then_json;
    const isEnabled = typeof req.body.is_enabled === 'boolean' ? req.body.is_enabled : existing.rows[0].is_enabled;

    const { rows } = await pool.query(
      `update rf_rules
       set name = $1, priority = $2, when_expr = $3, then_json = $4, is_enabled = $5, updated_at = now()
       where id = $6 and user_id = $7
       returning id, name, priority, is_enabled, when_expr, then_json`,
      [name, priority, whenExpr, thenJson, isEnabled, req.params.id, userId]
    );
    res.json({ rule: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/rules/:id', async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    await pool.query('delete from rf_rules where id = $1 and user_id = $2', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const input = req.body.input && typeof req.body.input === 'object' ? req.body.input : {};
    if (JSON.stringify(input).length > 65536) return res.status(400).json({ error: 'input too large' });

    const { rows: rules } = await pool.query(
      'select id, name, priority, is_enabled, when_expr, then_json from rf_rules where user_id = $1 and is_enabled = true order by priority desc',
      [userId]
    );

    const matched = [];
    let output = {};
    for (const rule of rules) {
      if (evaluateExpression(rule.when_expr, input)) {
        matched.push(rule.id);
        output = { ...output, ...(rule.then_json || {}) };
      }
    }

    await pool.query(
      'insert into rf_test_runs (user_id, input_json, matched_rule_ids, output_json) values ($1, $2, $3, $4)',
      [userId, input, matched, output]
    );

    res.json({ matched, output });
  } catch (error) {
    next(error);
  }
});

router.get('/runs', async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      'select id, input_json, matched_rule_ids, output_json, created_at from rf_test_runs where user_id = $1 order by created_at desc limit 50',
      [userId]
    );
    res.json({ runs: rows });
  } catch (error) {
    next(error);
  }
});

app.use('/api', router);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`rule-furnace listening on ${PORT}`));

module.exports = app;
