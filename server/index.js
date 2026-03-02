import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || '';
const PORT = process.env.PORT || 3011;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. API will fail until configured.');
}

const pool = new Pool({ connectionString: DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) {
    req.url = '/';
  } else if (req.url.startsWith(`${fnPrefix}/`)) {
    req.url = req.url.slice(fnPrefix.length);
  }
  next();
});

const MAX_PAGES = 10000;
const MAX_CARDS = 500;
const MAX_BODY = 20000;

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

function normalizeSlug(slug) {
  return slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

app.get('/api/cardpress/pages', requireDeviceKey, async (req, res) => {
  try {
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select id, title, slug, status, published_slug, created_at, updated_at
       from pages
       where user_id = $1
       order by updated_at desc`,
      [userId]
    );
    res.json({ pages: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/cardpress/pages', requireDeviceKey, async (req, res) => {
  try {
    const { title, slug } = req.body || {};
    if (!title || !slug) {
      return res.status(400).json({ error: 'title and slug are required' });
    }
    const userId = await getUserId(req.deviceKey);
    const { rows: countRows } = await pool.query(
      'select count(*)::int as count from pages where user_id = $1',
      [userId]
    );
    if (countRows[0].count >= MAX_PAGES) {
      return res.status(400).json({ error: 'page limit reached' });
    }
    const cleanSlug = normalizeSlug(slug);
    const { rows } = await pool.query(
      `insert into pages (user_id, title, slug)
       values ($1, $2, $3)
       returning id, title, slug, status, published_slug, created_at, updated_at`,
      [userId, title, cleanSlug]
    );
    res.json({ page: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/cardpress/pages/:id', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req.deviceKey);
    const { rows: pageRows } = await pool.query(
      `select id, title, slug, status, published_slug, created_at, updated_at
       from pages
       where id = $1 and user_id = $2`,
      [id, userId]
    );
    if (!pageRows[0]) {
      return res.status(404).json({ error: 'page not found' });
    }
    const { rows: cardRows } = await pool.query(
      `select id, type, ord, title, body, image_url, embed_url
       from page_cards
       where page_id = $1
       order by ord asc`,
      [id]
    );
    res.json({ page: pageRows[0], cards: cardRows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.patch('/api/cardpress/pages/:id', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, status } = req.body || {};
    const userId = await getUserId(req.deviceKey);

    let publishedSlug = null;
    if (status === 'published') {
      publishedSlug = crypto.randomBytes(6).toString('hex');
    }

    const { rows } = await pool.query(
      `update pages
       set title = coalesce($1, title),
           slug = coalesce($2, slug),
           status = coalesce($3, status),
           published_slug = coalesce($4, published_slug),
           updated_at = now()
       where id = $5 and user_id = $6
       returning id, title, slug, status, published_slug, created_at, updated_at`,
      [title || null, slug ? normalizeSlug(slug) : null, status || null, publishedSlug, id, userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'page not found' });
    }
    res.json({ page: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/cardpress/pages/:id', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req.deviceKey);
    const { rowCount } = await pool.query('delete from pages where id = $1 and user_id = $2', [id, userId]);
    if (!rowCount) {
      return res.status(404).json({ error: 'page not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/cardpress/pages/:id/cards', requireDeviceKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, ord, title = '', body = '', imageUrl = '', embedUrl = '' } = req.body || {};
    if (!type || ord === undefined) {
      return res.status(400).json({ error: 'type and ord are required' });
    }
    if (body.length > MAX_BODY) {
      return res.status(400).json({ error: 'body too large' });
    }
    const userId = await getUserId(req.deviceKey);

    const { rows: pageRows } = await pool.query('select id from pages where id = $1 and user_id = $2', [id, userId]);
    if (!pageRows[0]) {
      return res.status(404).json({ error: 'page not found' });
    }

    const { rows: countRows } = await pool.query('select count(*)::int as count from page_cards where page_id = $1', [id]);
    if (countRows[0].count >= MAX_CARDS) {
      return res.status(400).json({ error: 'card limit reached' });
    }

    const { rows } = await pool.query(
      `insert into page_cards (page_id, type, ord, title, body, image_url, embed_url)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, type, ord, title, body, image_url, embed_url`,
      [id, type, ord, title, body, imageUrl, embedUrl]
    );
    res.json({ card: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.patch('/api/cardpress/cards/:cardId', requireDeviceKey, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, body, imageUrl, embedUrl, ord } = req.body || {};
    if (body && body.length > MAX_BODY) {
      return res.status(400).json({ error: 'body too large' });
    }
    const userId = await getUserId(req.deviceKey);

    const { rows } = await pool.query(
      `update page_cards
       set title = coalesce($1, title),
           body = coalesce($2, body),
           image_url = coalesce($3, image_url),
           embed_url = coalesce($4, embed_url),
           ord = coalesce($5, ord)
       where id = $6 and page_id in (select id from pages where user_id = $7)
       returning id, type, ord, title, body, image_url, embed_url`,
      [title || null, body || null, imageUrl || null, embedUrl || null, ord ?? null, cardId, userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'card not found' });
    }
    res.json({ card: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/cardpress/cards/:cardId', requireDeviceKey, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = await getUserId(req.deviceKey);
    const { rowCount } = await pool.query(
      'delete from page_cards where id = $1 and page_id in (select id from pages where user_id = $2)',
      [cardId, userId]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'card not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/cardpress/public/:publishedSlug', async (req, res) => {
  try {
    const { publishedSlug } = req.params;
    const { rows: pageRows } = await pool.query(
      `select id, title, slug, status, published_slug, created_at, updated_at
       from pages
       where published_slug = $1 and status = 'published'`,
      [publishedSlug]
    );
    if (!pageRows[0]) {
      return res.status(404).json({ error: 'page not found' });
    }
    const { rows: cardRows } = await pool.query(
      `select id, type, ord, title, body, image_url, embed_url
       from page_cards
       where page_id = $1
       order by ord asc`,
      [pageRows[0].id]
    );
    res.json({ page: pageRows[0], cards: cardRows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const isDirectRun = (() => {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
})();

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`CardPress API running on port ${PORT}`);
  });
}

export default app;
