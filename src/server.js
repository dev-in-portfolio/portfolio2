const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3091);
const DATABASE_URL =
  process.env.VAULTKEY_DATABASE_URL ||
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
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) {
    req.url = '/';
  } else if (req.url.startsWith(`${fnPrefix}/`)) {
    req.url = req.url.slice(fnPrefix.length);
  }
  next();
});

function requireDb() {
  if (!pool) {
    const error = new Error('DATABASE_URL not configured');
    error.status = 500;
    throw error;
  }
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
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

app.get('/api/entries', async (req, res, next) => {
  try {
    requireDb();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const { rows } = await pool.query(
      `select id, title, tags, encode(salt, 'base64') as salt_b64, encode(iv, 'base64') as iv_b64,
              created_at, updated_at
       from sealed_entries
       order by created_at desc
       limit $1`,
      [limit]
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        tags: r.tags || [],
        saltB64: r.salt_b64,
        ivB64: r.iv_b64,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/entries', async (req, res, next) => {
  try {
    requireDb();
    const title = String(req.body.title || '').trim().slice(0, 120);
    if (!title) {
      const error = new Error('title required');
      error.status = 422;
      throw error;
    }
    const tags = parseTags(req.body.tags);
    const plaintext = String(req.body.plaintext || '');
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const ciphertext = Buffer.from(plaintext, 'utf8');

    const { rows } = await pool.query(
      `insert into sealed_entries (title, tags, salt, iv, ciphertext)
       values ($1, $2, $3, $4, $5)
       returning id, title, tags, created_at, updated_at`,
      [title, tags, salt, iv, ciphertext]
    );
    const row = rows[0];
    res.status(201).json({
      id: row.id,
      title: row.title,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/entries/:id', async (req, res, next) => {
  try {
    requireDb();
    const result = await pool.query('delete from sealed_entries where id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
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
  app.listen(PORT, () => console.log(`vault-key listening on ${PORT}`));
}

module.exports = app;
