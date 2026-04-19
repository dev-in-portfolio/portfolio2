const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3017);
const DATABASE_URL =
  process.env.DIFFLENS_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  '';

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    })
  : null;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  if (req.url === '/api') {
    req.url = '/';
  } else if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4);
  }
  next();
});

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function getUserKey(req) {
  const key = String(req.header('x-user-key') || req.header('x-device-key') || '').trim();
  if (!key) {
    const error = new Error('Missing x-user-key');
    error.status = 401;
    throw error;
  }
  if (key.length > 256) {
    const error = new Error('Invalid x-user-key');
    error.status = 400;
    throw error;
  }
  return key;
}

function requireDb() {
  if (!pool) {
    const error = new Error('DATABASE_URL not configured');
    error.status = 500;
    throw error;
  }
}

function diffText(a, b, granularity) {
  const splitter = granularity === 'word' ? /\s+/ : /\n/;
  const aa = String(a).split(splitter);
  const bb = String(b).split(splitter);
  const max = Math.max(aa.length, bb.length);
  const diff = [];
  const summary = { added: 0, removed: 0, changed: 0, equal: 0 };

  for (let i = 0; i < max; i += 1) {
    const av = aa[i];
    const bv = bb[i];
    if (av === undefined && bv !== undefined) {
      diff.push({ type: 'add', index: i, b: bv });
      summary.added += 1;
      continue;
    }
    if (av !== undefined && bv === undefined) {
      diff.push({ type: 'remove', index: i, a: av });
      summary.removed += 1;
      continue;
    }
    if (av === bv) {
      diff.push({ type: 'equal', index: i, value: av });
      summary.equal += 1;
    } else {
      diff.push({ type: 'change', index: i, a: av, b: bv });
      summary.changed += 1;
    }
  }

  return { diff, summary };
}

function flattenJson(value, path = '$', out = {}) {
  if (value === null || typeof value !== 'object') {
    out[path] = value;
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => flattenJson(item, `${path}[${i}]`, out));
    if (value.length === 0) out[path] = [];
    return out;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) out[path] = {};
  for (const key of keys) {
    flattenJson(value[key], `${path}.${key}`, out);
  }
  return out;
}

function diffJson(a, b) {
  let objA;
  let objB;
  try {
    objA = JSON.parse(String(a));
    objB = JSON.parse(String(b));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }

  const mapA = flattenJson(objA);
  const mapB = flattenJson(objB);
  const paths = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)])).sort();

  const diff = [];
  const summary = { added: 0, removed: 0, changed: 0, equal: 0 };

  for (const path of paths) {
    if (!(path in mapA)) {
      diff.push({ type: 'add', path, b: mapB[path] });
      summary.added += 1;
    } else if (!(path in mapB)) {
      diff.push({ type: 'remove', path, a: mapA[path] });
      summary.removed += 1;
    } else if (JSON.stringify(mapA[path]) === JSON.stringify(mapB[path])) {
      diff.push({ type: 'equal', path, value: mapA[path] });
      summary.equal += 1;
    } else {
      diff.push({ type: 'change', path, a: mapA[path], b: mapB[path] });
      summary.changed += 1;
    }
  }

  return { diff, summary };
}

function normalizePayload(body = {}) {
  const mode = body.mode === 'json' ? 'json' : 'text';
  const granularity = body.granularity === 'word' ? 'word' : mode === 'json' ? 'path' : 'line';
  const a = String(body.a || '');
  const b = String(body.b || '');
  if (a.length > 250000 || b.length > 250000) {
    const error = new Error('payload too large');
    error.status = 400;
    throw error;
  }
  return { mode, granularity, a, b, options: body.options || {} };
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/health/db', async (_req, res) => {
  if (!pool) return res.json({ ok: false, error: 'DATABASE_URL not configured' });
  try {
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/diff/validate', (req, res, next) => {
  try {
    const payload = normalizePayload(req.body);
    getUserKey(req);
    res.json({ ok: true, mode: payload.mode, granularity: payload.granularity, options: payload.options });
  } catch (error) {
    next(error);
  }
});

app.post('/diff', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const payload = normalizePayload(req.body);
    const output = payload.mode === 'json'
      ? diffJson(payload.a, payload.b)
      : diffText(payload.a, payload.b, payload.granularity);

    const summaryPayload = {
      mode: payload.mode,
      granularity: payload.granularity,
      ...output.summary,
    };

    const result = {
      summary: summaryPayload,
      diff: output.diff,
      options: payload.options,
    };

    const { rows } = await pool.query(
      `insert into diff_runs (user_key, mode, granularity, a_hash, b_hash, a_size, b_size, result)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning id`,
      [
        userKey,
        payload.mode,
        payload.granularity,
        sha256Text(payload.a),
        sha256Text(payload.b),
        payload.a.length,
        payload.b.length,
        result,
      ]
    );

    res.json({
      id: rows[0].id,
      summary: summaryPayload,
      diff: output.diff,
      options: payload.options,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/history', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const { rows } = await pool.query(
      `select id, mode, granularity, created_at, a_hash, b_hash, result
       from diff_runs where user_key = $1
       order by created_at desc
       limit $2`,
      [userKey, limit]
    );
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        mode: row.mode,
        granularity: row.granularity,
        createdAt: row.created_at,
        aHash: row.a_hash,
        bHash: row.b_hash,
        summary: row.result.summary,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/runs/:id', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const { rows } = await pool.query(
      `select id, mode, granularity, result, created_at
       from diff_runs
       where id = $1 and user_key = $2
       limit 1`,
      [req.params.id, userKey]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Run not found' });
    const row = rows[0];
    res.json({ id: row.id, mode: row.mode, granularity: row.granularity, result: row.result, createdAt: row.created_at });
  } catch (error) {
    next(error);
  }
});

app.delete('/runs/:id', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const result = await pool.query('delete from diff_runs where id = $1 and user_key = $2', [req.params.id, userKey]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Run not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`difflens listening on ${PORT}`);
  });
}

module.exports = app;
