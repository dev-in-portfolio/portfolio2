const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3018);
const DATABASE_URL =
  process.env.QUEJUDGE_DATABASE_URL ||
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
app.use((req, _res, next) => {
  if (req.url === '/api') {
    req.url = '/';
  } else if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4);
  }
  next();
});

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

function clampNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseDate(d) {
  const parsed = new Date(`${d}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function daysUntil(due, now) {
  const dueDate = parseDate(due);
  const nowDate = parseDate(now);
  if (!dueDate || !nowDate) return null;
  return Math.floor((dueDate.valueOf() - nowDate.valueOf()) / 86400000);
}

function scoreItems(items, rules = {}) {
  const weights = {
    tagBoost: clampNumber(rules.weights?.tagBoost, 2),
    dueSoonBoost: clampNumber(rules.weights?.dueSoonBoost, 3),
    effortPenalty: clampNumber(rules.weights?.effortPenalty, 1),
    valueBoost: clampNumber(rules.weights?.valueBoost, 2),
    keywordBoost: clampNumber(rules.weights?.keywordBoost, 1.5),
  };

  const preferTags = new Set((rules.preferTags || []).map((x) => String(x).toLowerCase()));
  const avoidTags = new Set((rules.avoidTags || []).map((x) => String(x).toLowerCase()));
  const preferKeywords = (rules.preferKeywords || []).map((x) => String(x).toLowerCase());
  const avoidKeywords = (rules.avoidKeywords || []).map((x) => String(x).toLowerCase());
  const now = rules.now || new Date().toISOString().slice(0, 10);

  return items.map((item, index) => {
    const tags = Array.isArray(item.tags) ? item.tags.map((x) => String(x).toLowerCase()) : [];
    const label = String(item.label || '').toLowerCase();
    const effort = clampNumber(item.effort, 0);
    const value = clampNumber(item.value, 0);

    let score = 0;
    let tagMatches = 0;
    let keywordMatches = 0;
    const reasons = [];

    for (const tag of tags) {
      if (preferTags.has(tag)) {
        score += weights.tagBoost;
        tagMatches += 1;
      }
      if (avoidTags.has(tag)) {
        score -= weights.tagBoost;
        reasons.push(`avoid:${tag}`);
      }
    }

    for (const kw of preferKeywords) {
      if (kw && label.includes(kw)) {
        score += weights.keywordBoost;
        keywordMatches += 1;
      }
    }
    for (const kw of avoidKeywords) {
      if (kw && label.includes(kw)) {
        score -= weights.keywordBoost;
        reasons.push(`avoidkw:${kw}`);
      }
    }

    if (value > 0) score += value * weights.valueBoost;
    if (effort > 0) score -= effort * weights.effortPenalty;

    if (item.due) {
      const d = daysUntil(item.due, now);
      if (d !== null && d <= 2) {
        score += weights.dueSoonBoost;
        reasons.push('dueSoon');
      }
    }

    return {
      ...item,
      _meta: {
        index,
        tagMatches,
        keywordMatches,
        reasons,
      },
      score: Number(score.toFixed(3)),
    };
  }).sort((a, b) => b.score - a.score || a._meta.index - b._meta.index);
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

app.post('/judge', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const rules = req.body.rules || {};
    if (items.length === 0) {
      const error = new Error('items required');
      error.status = 422;
      throw error;
    }
    if (items.length > 500) {
      const error = new Error('items exceed hard max');
      error.status = 422;
      throw error;
    }

    const ranked = scoreItems(items, rules);
    const result = {
      ranked,
      explanations: ranked.slice(0, 20).map((item) => ({
        id: item.id,
        label: item.label,
        score: item.score,
        reasons: item._meta.reasons,
      })),
      resolvedNow: rules.now || new Date().toISOString().slice(0, 10),
    };

    const { rows } = await pool.query(
      `insert into judge_runs (user_key, items, rules, result)
       values ($1, $2, $3, $4)
       returning id`,
      [userKey, items, rules, result]
    );

    res.json({ id: rows[0].id, ...result });
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
      `select id, created_at, items
       from judge_runs
       where user_key = $1
       order by created_at desc
       limit $2`,
      [userKey, limit]
    );
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        itemCount: Array.isArray(row.items) ? row.items.length : 0,
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
      `select id, result
       from judge_runs
       where id = $1 and user_key = $2
       limit 1`,
      [req.params.id, userKey]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Run not found' });
    res.json({ id: rows[0].id, ...rows[0].result });
  } catch (error) {
    next(error);
  }
});

app.delete('/runs/:id', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const result = await pool.query('delete from judge_runs where id = $1 and user_key = $2', [req.params.id, userKey]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Run not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/rulepacks', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const name = String(req.body.name || '').trim();
    if (!name) {
      const error = new Error('name required');
      error.status = 422;
      throw error;
    }
    const rules = req.body.rules || {};
    await pool.query(
      `insert into rulepacks (user_key, name, rules)
       values ($1, $2, $3)
       on conflict (user_key, name)
       do update set rules = excluded.rules`,
      [userKey, name, rules]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/rulepacks/validate', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(422).json({ error: 'name required' });
  res.json({ ok: true });
});

app.get('/rulepacks', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const { rows } = await pool.query(
      `select name, created_at
       from rulepacks
       where user_key = $1
       order by created_at desc`,
      [userKey]
    );
    res.json({ items: rows.map((r) => ({ name: r.name, createdAt: r.created_at })) });
  } catch (error) {
    next(error);
  }
});

app.get('/rulepacks/:name', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const { rows } = await pool.query(
      'select name, rules, created_at from rulepacks where user_key = $1 and name = $2 limit 1',
      [userKey, req.params.name]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Rulepack not found' });
    const row = rows[0];
    res.json({ name: row.name, rules: row.rules, createdAt: row.created_at });
  } catch (error) {
    next(error);
  }
});

app.put('/rulepacks/:name', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const name = String(req.body.name || '').trim();
    if (name !== req.params.name) {
      const error = new Error('Name mismatch');
      error.status = 400;
      throw error;
    }
    const rules = req.body.rules || {};
    await pool.query(
      `insert into rulepacks (user_key, name, rules)
       values ($1, $2, $3)
       on conflict (user_key, name)
       do update set rules = excluded.rules`,
      [userKey, name, rules]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/rulepacks/:name', async (req, res, next) => {
  try {
    requireDb();
    const userKey = getUserKey(req);
    const result = await pool.query('delete from rulepacks where user_key = $1 and name = $2', [userKey, req.params.name]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Rulepack not found' });
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
    console.log(`quejudge listening on ${PORT}`);
  });
}

module.exports = app;
