const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3137);
const DATABASE_URL =
  process.env.RECALGRID_DATABASE_URL ||
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
app.use(express.json({ limit: '2mb' }));
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
  await pool.query('insert into rg_users(device_key) values ($1) on conflict do nothing', [deviceKey]);
  const row = await pool.query('select id from rg_users where device_key = $1', [deviceKey]);
  return row.rows[0].id;
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) return [...new Set(raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].sort();
  return [...new Set(String(raw || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].sort();
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

app.post('/api/recalgrid/chunks', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const source = String(req.body.source || '').trim();
    const tags = normalizeTags(req.body.tags);
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!body) return res.status(400).json({ error: 'body required' });
    if (body.length > 200000) return res.status(400).json({ error: 'body exceeds 200k characters' });
    const { rows } = await pool.query(
      `insert into rg_chunks (user_id, title, source, tags, body)
       values ($1, $2, $3, $4, $5)
       returning id, title, source, tags, body, created_at`,
      [userId, title, source, tags, body]
    );
    res.status(201).json({ chunk: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/recalgrid/tags', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      `select distinct unnest(tags) as tag
       from rg_chunks where user_id = $1
       order by tag`,
      [userId]
    );
    res.json({ tags: rows.map((r) => r.tag) });
  } catch (error) { next(error); }
});

app.post('/api/recalgrid/search', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const query = String(req.body.query || '').trim();
    const tags = normalizeTags(req.body.tags || []);
    const limit = Math.min(100, Math.max(1, Number(req.body.limit || 15)));

    const params = [userId];
    let tagClause = '';
    if (tags.length) {
      params.push(tags);
      tagClause = ` and tags @> $${params.length}`;
    }

    if (query) {
      params.push(query);
      params.push(query);
      params.push(limit);
      const rankQuery = `
        select id, title, source, tags, body, created_at,
               ts_rank(body_tsv, plainto_tsquery('english', $${params.length - 2})) as rank
        from rg_chunks
        where user_id = $1
          and body_tsv @@ plainto_tsquery('english', $${params.length - 1})
          ${tagClause}
        order by rank desc, created_at desc
        limit $${params.length}
      `;
      const ranked = await pool.query(rankQuery, params);
      if (ranked.rows.length) return res.json({ results: ranked.rows });

      const params2 = [userId, query, query];
      let tagClause2 = '';
      if (tags.length) {
        params2.push(tags);
        tagClause2 = ` and tags @> $${params2.length}`;
      }
      params2.push(limit);
      const fuzzy = await pool.query(
        `select id, title, source, tags, body, created_at,
                similarity(title, $2) as sim
         from rg_chunks
         where user_id = $1 and title % $3
         ${tagClause2}
         order by sim desc, created_at desc
         limit $${params2.length}`,
        params2
      );
      return res.json({ results: fuzzy.rows });
    }

    const params3 = [userId];
    let where = 'where user_id = $1';
    if (tags.length) {
      params3.push(tags);
      where += ` and tags @> $${params3.length}`;
    }
    params3.push(limit);
    const all = await pool.query(
      `select id, title, source, tags, body, created_at
       from rg_chunks ${where}
       order by created_at desc
       limit $${params3.length}`,
      params3
    );
    res.json({ results: all.rows });
  } catch (error) { next(error); }
});

app.get('/api/recalgrid/chunks/:id', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      'select id, title, source, tags, body, created_at from rg_chunks where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'chunk not found' });
    res.json({ chunk: rows[0] });
  } catch (error) { next(error); }
});

app.delete('/api/recalgrid/chunks/:id', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    await pool.query('delete from rg_chunks where id = $1 and user_id = $2', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/recalgrid/export', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const format = String(req.query.format || 'json').toLowerCase();
    const { rows } = await pool.query(
      'select id, title, source, tags, body, created_at from rg_chunks where user_id = $1 order by created_at desc',
      [userId]
    );

    if (format === 'csv') {
      const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
      const lines = ['id,title,source,tags,body,created_at'];
      for (const r of rows) {
        lines.push([r.id, r.title, r.source, (r.tags || []).join(','), r.body, r.created_at].map(esc).join(','));
      }
      res.type('text/csv').send(lines.join('\n'));
      return;
    }

    res.json({ chunks: rows });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`recalgrid listening on ${PORT}`));

module.exports = app;
