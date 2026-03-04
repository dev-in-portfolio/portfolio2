const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3136);
const DATABASE_URL =
  process.env.PATCHSMITH_DATABASE_URL ||
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
  await pool.query('insert into ps_users(device_key) values ($1) on conflict do nothing', [deviceKey]);
  const row = await pool.query('select id from ps_users where device_key = $1', [deviceKey]);
  return row.rows[0].id;
}

function findMatches(content, needle) {
  const out = [];
  if (!needle) return out;
  let pos = 0;
  while (true) {
    const i = content.indexOf(needle, pos);
    if (i === -1) break;
    out.push([i, i + needle.length]);
    pos = i + needle.length;
  }
  return out;
}

function applyOccurrence(content, findText, replaceText, occurrence) {
  const matches = findMatches(content, findText);
  if (!matches.length) throw new Error('FIND text not found');
  if (occurrence < 1 || occurrence > matches.length) throw new Error('Invalid occurrence');
  const [s, e] = matches[occurrence - 1];
  return content.slice(0, s) + replaceText + content.slice(e);
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

app.get('/api/patchsmith/projects', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query('select id, name, created_at from ps_projects where user_id = $1 order by created_at desc', [userId]);
    res.json({ projects: rows });
  } catch (error) { next(error); }
});

app.post('/api/patchsmith/projects', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      `insert into ps_projects (user_id, name)
       values ($1, $2)
       on conflict (user_id, name)
       do update set name = excluded.name
       returning id, name, created_at`,
      [userId, name]
    );
    res.status(201).json({ project: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/patchsmith/projects/:projectId/files', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from ps_projects where id = $1 and user_id = $2', [req.params.projectId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'project not found' });
    const { rows } = await pool.query('select id, path, content, updated_at from ps_files where project_id = $1 order by path', [req.params.projectId]);
    res.json({ files: rows });
  } catch (error) { next(error); }
});

app.post('/api/patchsmith/projects/:projectId/files', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from ps_projects where id = $1 and user_id = $2', [req.params.projectId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'project not found' });

    const path = String(req.body.path || '').trim();
    const content = String(req.body.content || '');
    if (!path) return res.status(400).json({ error: 'path required' });
    if (!content) return res.status(400).json({ error: 'content required' });

    const { rows } = await pool.query(
      `insert into ps_files (project_id, path, content)
       values ($1, $2, $3)
       on conflict (project_id, path)
       do update set content = excluded.content, updated_at = now()
       returning id, path, content, updated_at`,
      [req.params.projectId, path, content]
    );
    res.status(201).json({ file: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/patchsmith/projects/:projectId/patches', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from ps_projects where id = $1 and user_id = $2', [req.params.projectId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'project not found' });
    const { rows } = await pool.query(
      'select id, file_path, find_text, replace_text, status, created_at from ps_patches where project_id = $1 order by created_at desc',
      [req.params.projectId]
    );
    res.json({ patches: rows });
  } catch (error) { next(error); }
});

app.post('/api/patchsmith/projects/:projectId/patches', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from ps_projects where id = $1 and user_id = $2', [req.params.projectId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'project not found' });

    const filePath = String(req.body.file_path || '').trim();
    const findText = String(req.body.find_text || '');
    const replaceText = String(req.body.replace_text || '');
    if (!filePath || !findText) return res.status(400).json({ error: 'file_path and find_text required' });

    const file = await pool.query('select content from ps_files where project_id = $1 and path = $2', [req.params.projectId, filePath]);
    if (!file.rows[0]) return res.status(404).json({ error: 'file not found' });

    const matches = findMatches(file.rows[0].content, findText);
    if (!matches.length) return res.status(400).json({ error: 'FIND text not found' });

    const { rows } = await pool.query(
      `insert into ps_patches (project_id, file_path, find_text, replace_text)
       values ($1, $2, $3, $4)
       returning id, file_path, find_text, replace_text, status, created_at`,
      [req.params.projectId, filePath, findText, replaceText]
    );
    res.status(201).json({ patch: { ...rows[0], match_count: matches.length } });
  } catch (error) { next(error); }
});

app.post('/api/patchsmith/patches/:patchId/approve', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const patch = await pool.query(
      `select p.* from ps_patches p
       join ps_projects pr on pr.id = p.project_id
       where p.id = $1 and pr.user_id = $2`,
      [req.params.patchId, userId]
    );
    if (!patch.rows[0]) return res.status(404).json({ error: 'patch not found' });
    await pool.query('update ps_patches set status = $1 where id = $2', ['approved', req.params.patchId]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post('/api/patchsmith/patches/:patchId/apply', requireDeviceKey, async (req, res, next) => {
  const client = await pool.connect();
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const occurrence = Math.max(1, Number(req.body.occurrence || 1));

    const patchRes = await client.query(
      `select p.* from ps_patches p
       join ps_projects pr on pr.id = p.project_id
       where p.id = $1 and pr.user_id = $2`,
      [req.params.patchId, userId]
    );
    const patch = patchRes.rows[0];
    if (!patch) return res.status(404).json({ error: 'patch not found' });

    const fileRes = await client.query('select * from ps_files where project_id = $1 and path = $2', [patch.project_id, patch.file_path]);
    const file = fileRes.rows[0];
    if (!file) return res.status(404).json({ error: 'file not found' });

    const updated = applyOccurrence(file.content, patch.find_text, patch.replace_text, occurrence);
    await client.query('begin');
    await client.query('update ps_files set content = $1, updated_at = now() where id = $2', [updated, file.id]);
    await client.query('update ps_patches set status = $1 where id = $2', ['applied', patch.id]);
    await client.query('commit');

    res.json({ ok: true, updated_content: updated });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`patchsmith listening on ${PORT}`));

module.exports = app;
