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

let schemaInitPromise = null;

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

async function ensureSchema() {
  requireDb();
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      try {
        await pool.query('create extension if not exists pgcrypto');
      } catch (_e) {}
      try {
        await pool.query('create extension if not exists pg_trgm');
      } catch (_e) {}
      await pool.query(`
        create table if not exists rg_users (
          id uuid primary key default gen_random_uuid(),
          device_key text not null unique,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists rg_chunks (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references rg_users(id) on delete cascade,
          title text not null,
          source text not null default '',
          tags text[] not null default '{}',
          body text not null,
          notes text,
          confidence numeric,
          pinned boolean not null default false,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists rg_relationships (
          id uuid primary key default gen_random_uuid(),
          from_chunk_id uuid not null references rg_chunks(id) on delete cascade,
          to_chunk_id uuid not null references rg_chunks(id) on delete cascade,
          relationship_type text not null,
          description text,
          created_at timestamptz not null default now(),
          unique(from_chunk_id, to_chunk_id, relationship_type)
        )
      `);
      await pool.query(`
        create table if not exists rg_collections (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references rg_users(id) on delete cascade,
          name text not null,
          description text,
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create table if not exists rg_collection_items (
          id uuid primary key default gen_random_uuid(),
          collection_id uuid not null references rg_collections(id) on delete cascade,
          chunk_id uuid not null references rg_chunks(id) on delete cascade,
          added_at timestamptz not null default now(),
          unique(collection_id, chunk_id)
        )
      `);
      await pool.query(`
        create table if not exists rg_saved_searches (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references rg_users(id) on delete cascade,
          name text not null,
          search_query text not null,
          search_tags text[] not null default '{}',
          created_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        alter table rg_chunks
        add column if not exists body_tsv tsvector
        generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored
      `);
      await pool.query('create index if not exists idx_rg_chunks_tsv on rg_chunks using gin(body_tsv)');
      await pool.query('create index if not exists idx_rg_chunks_tags_gin on rg_chunks using gin(tags)');
      try {
        await pool.query('create index if not exists idx_rg_chunks_title_trgm on rg_chunks using gin(title gin_trgm_ops)');
      } catch (_e) {}
      await pool.query('create index if not exists idx_rg_chunks_user_time on rg_chunks(user_id, created_at desc)');
      await pool.query('create index if not exists idx_rg_relationships_from on rg_relationships(from_chunk_id)');
      await pool.query('create index if not exists idx_rg_relationships_to on rg_relationships(to_chunk_id)');
      await pool.query('create index if not exists idx_rg_collections_user on rg_collections(user_id)');
      await pool.query('create index if not exists idx_rg_collection_items_collection on rg_collection_items(collection_id)');
      await pool.query('create index if not exists idx_rg_saved_searches_user on rg_saved_searches(user_id)');
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }
  return schemaInitPromise;
}

async function requireDbReady() {
  requireDb();
  await ensureSchema();
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
    await ensureSchema();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/recalgrid/chunks', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const source = String(req.body.source || '').trim();
    const tags = normalizeTags(req.body.tags);
    const notes = String(req.body.notes || '');
    const confidence = Number(req.body.confidence);
    const pinned = Boolean(req.body.pinned);
    
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!body) return res.status(400).json({ error: 'body required' });
    if (body.length > 200000) return res.status(400).json({ error: 'body exceeds 200k characters' });
    
    const { rows } = await pool.query(
      `insert into rg_chunks (user_id, title, source, tags, body, notes, confidence, pinned)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, title, source, tags, body, notes, confidence, pinned, created_at`,
      [userId, title, source, tags, body, notes, confidence, pinned]
    );
    res.status(201).json({ chunk: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/recalgrid/tags', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
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
    await requireDbReady();
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
      try {
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
      } catch (_e) {
        const ilike = await pool.query(
          `select id, title, source, tags, body, created_at
           from rg_chunks
           where user_id = $1 and title ilike '%' || $2 || '%'
           ${tagClause2}
           order by created_at desc
           limit $${params2.length}`,
          params2
        );
        return res.json({ results: ilike.rows });
      }
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
    await requireDbReady();
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
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    await pool.query('delete from rg_chunks where id = $1 and user_id = $2', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/recalgrid/export', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const format = String(req.query.format || 'json').toLowerCase();
    const { rows } = await pool.query(
      'select id, title, source, tags, body, notes, confidence, pinned, created_at from rg_chunks where user_id = $1 order by created_at desc',
      [userId]
    );

    if (format === 'csv') {
      const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
      const lines = ['id,title,source,tags,body,notes,confidence,pinned,created_at'];
      for (const r of rows) {
        lines.push([r.id, r.title, r.source, (r.tags || []).join(','), r.body, r.notes, r.confidence, r.pinned, r.created_at].map(esc).join(','));
      }
      res.type('text/csv').send(lines.join('\n'));
      return;
    }

    res.json({ chunks: rows });
  } catch (error) { next(error); }
});

// Update chunk
app.put('/api/recalgrid/chunks/:id', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const source = String(req.body.source || '').trim();
    const tags = normalizeTags(req.body.tags);
    const notes = String(req.body.notes || '');
    const confidence = Number(req.body.confidence);
    const pinned = Boolean(req.body.pinned);
    
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!body) return res.status(400).json({ error: 'body required' });
    
    const updates = ['updated_at = now()'];
    const params = [userId, req.params.id];
    
    if (title) {
      updates.push(`title = $${params.length + 1}`);
      params.push(title);
    }
    
    if (body) {
      updates.push(`body = $${params.length + 1}`);
      params.push(body);
    }
    
    if (source !== undefined) {
      updates.push(`source = $${params.length + 1}`);
      params.push(source);
    }
    
    if (tags !== undefined) {
      updates.push(`tags = $${params.length + 1}`);
      params.push(tags);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${params.length + 1}`);
      params.push(notes);
    }
    
    if (confidence !== undefined) {
      updates.push(`confidence = $${params.length + 1}`);
      params.push(confidence);
    }
    
    if (pinned !== undefined) {
      updates.push(`pinned = $${params.length + 1}`);
      params.push(pinned);
    }
    
    const { rows } = await pool.query(
      `update rg_chunks set ${updates.join(', ')} where id = $2 and user_id = $1 returning id, title, source, tags, body, notes, confidence, pinned, created_at, updated_at`,
      params
    );
    
    if (!rows[0]) return res.status(404).json({ error: 'chunk not found' });
    res.json({ chunk: rows[0] });
  } catch (error) { next(error); }
});

// Get chunk relationships
app.get('/api/recalgrid/chunks/:id/relationships', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    
    // Verify chunk exists and belongs to user
    const chunkCheck = await pool.query('select 1 from rg_chunks where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!chunkCheck.rows[0]) return res.status(404).json({ error: 'chunk not found' });
    
    // Get relationships
    const relationships = await pool.query(
      `select r.id, r.relationship_type, r.description, r.created_at,
              c.id as related_chunk_id, c.title as related_chunk_title, c.source as related_chunk_source
       from rg_relationships r
       join rg_chunks c on c.id = r.to_chunk_id
       where r.from_chunk_id = $1
       union all
       select r.id, r.relationship_type, r.description, r.created_at,
              c.id as related_chunk_id, c.title as related_chunk_title, c.source as related_chunk_source
       from rg_relationships r
       join rg_chunks c on c.id = r.from_chunk_id
       where r.to_chunk_id = $1`,
      [req.params.id]
    );
    
    res.json({ relationships: relationships.rows });
  } catch (error) { next(error); }
});

// Create relationship
app.post('/api/recalgrid/chunks/:fromId/relationships', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const toChunkId = String(req.body.to_chunk_id || '').trim();
    const relationshipType = String(req.body.relationship_type || '').trim();
    const description = String(req.body.description || '');
    
    if (!toChunkId) return res.status(400).json({ error: 'to_chunk_id required' });
    if (!relationshipType) return res.status(400).json({ error: 'relationship_type required' });
    
    // Verify both chunks exist and belong to user
    const fromCheck = await pool.query('select 1 from rg_chunks where id = $1 and user_id = $2', [req.params.fromId, userId]);
    const toCheck = await pool.query('select 1 from rg_chunks where id = $1 and user_id = $2', [toChunkId, userId]);
    if (!fromCheck.rows[0] || !toCheck.rows[0]) return res.status(404).json({ error: 'chunk not found' });
    
    const { rows } = await pool.query(
      `insert into rg_relationships (from_chunk_id, to_chunk_id, relationship_type, description)
       values ($1, $2, $3, $4)
       on conflict (from_chunk_id, to_chunk_id, relationship_type) do nothing
       returning id, from_chunk_id, to_chunk_id, relationship_type, description, created_at`,
      [req.params.fromId, toChunkId, relationshipType, description]
    );
    
    if (!rows[0]) return res.status(409).json({ error: 'relationship already exists' });
    res.status(201).json({ relationship: rows[0] });
  } catch (error) { next(error); }
});

// Delete relationship
app.delete('/api/recalgrid/relationships/:id', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    
    // Verify relationship exists and involves user's chunks
    const relCheck = await pool.query(
      `select 1 from rg_relationships r
       join rg_chunks c1 on c1.id = r.from_chunk_id
       where r.id = $1 and c1.user_id = $2`,
      [req.params.id, userId]
    );
    if (!relCheck.rows[0]) return res.status(404).json({ error: 'relationship not found' });
    
    await pool.query('delete from rg_relationships where id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// Collections
app.get('/api/recalgrid/collections', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      'select id, name, description, created_at from rg_collections where user_id = $1 order by created_at desc',
      [userId]
    );
    res.json({ collections: rows });
  } catch (error) { next(error); }
});

app.post('/api/recalgrid/collections', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '');
    
    if (!name) return res.status(400).json({ error: 'name required' });
    
    const { rows } = await pool.query(
      `insert into rg_collections (user_id, name, description)
       values ($1, $2, $3)
       returning id, name, description, created_at`,
      [userId, name, description]
    );
    res.status(201).json({ collection: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/recalgrid/collections/:id', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    
    // Get collection
    const collection = await pool.query(
      'select id, name, description, created_at from rg_collections where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    if (!collection.rows[0]) return res.status(404).json({ error: 'collection not found' });
    
    // Get collection items
    const items = await pool.query(
      `select ci.added_at, c.id, c.title, c.source, c.tags, c.body, c.notes, c.confidence, c.pinned, c.created_at
       from rg_collection_items ci
       join rg_chunks c on c.id = ci.chunk_id
       where ci.collection_id = $1
       order by ci.added_at desc`,
      [req.params.id]
    );
    
    res.json({ 
      collection: collection.rows[0],
      items: items.rows
    });
  } catch (error) { next(error); }
});

app.post('/api/recalgrid/collections/:id/items', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const chunkId = String(req.body.chunk_id || '').trim();
    
    if (!chunkId) return res.status(400).json({ error: 'chunk_id required' });
    
    // Verify collection and chunk exist and belong to user
    const collCheck = await pool.query('select 1 from rg_collections where id = $1 and user_id = $2', [req.params.id, userId]);
    const chunkCheck = await pool.query('select 1 from rg_chunks where id = $1 and user_id = $2', [chunkId, userId]);
    if (!collCheck.rows[0] || !chunkCheck.rows[0]) return res.status(404).json({ error: 'not found' });
    
    const { rows } = await pool.query(
      `insert into rg_collection_items (collection_id, chunk_id)
       values ($1, $2)
       on conflict (collection_id, chunk_id) do nothing
       returning id, collection_id, chunk_id, added_at`,
      [req.params.id, chunkId]
    );
    
    if (!rows[0]) return res.status(409).json({ error: 'chunk already in collection' });
    res.status(201).json({ item: rows[0] });
  } catch (error) { next(error); }
});

app.delete('/api/recalgrid/collections/:collectionId/items/:chunkId', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    
    // Verify collection and chunk belong to user
    const collCheck = await pool.query('select 1 from rg_collections where id = $1 and user_id = $2', [req.params.collectionId, userId]);
    const chunkCheck = await pool.query('select 1 from rg_chunks where id = $1 and user_id = $2', [req.params.chunkId, userId]);
    if (!collCheck.rows[0] || !chunkCheck.rows[0]) return res.status(404).json({ error: 'not found' });
    
    await pool.query('delete from rg_collection_items where collection_id = $1 and chunk_id = $2', [req.params.collectionId, req.params.chunkId]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// Saved searches
app.get('/api/recalgrid/saved-searches', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      'select id, name, search_query, search_tags, created_at from rg_saved_searches where user_id = $1 order by created_at desc',
      [userId]
    );
    res.json({ searches: rows });
  } catch (error) { next(error); }
});

app.post('/api/recalgrid/saved-searches', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    const name = String(req.body.name || '').trim();
    const searchQuery = String(req.body.search_query || '');
    const searchTags = normalizeTags(req.body.search_tags || []);
    
    if (!name) return res.status(400).json({ error: 'name required' });
    
    const { rows } = await pool.query(
      `insert into rg_saved_searches (user_id, name, search_query, search_tags)
       values ($1, $2, $3, $4)
       returning id, name, search_query, search_tags, created_at`,
      [userId, name, searchQuery, searchTags]
    );
    res.status(201).json({ search: rows[0] });
  } catch (error) { next(error); }
});

app.post('/api/recalgrid/saved-searches/:id/run', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    
    // Get saved search
    const search = await pool.query(
      'select search_query, search_tags from rg_saved_searches where id = $1 and user_id = $2',
      [req.params.id, userId]
    );
    if (!search.rows[0]) return res.status(404).json({ error: 'saved search not found' });
    
    // Run the search
    const payload = {
      query: search.rows[0].search_query,
      tags: search.rows[0].search_tags,
      limit: 20
    };
    
    const res2 = await fetch('http://localhost:' + PORT + '/api/recalgrid/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': req.deviceKey },
      body: JSON.stringify(payload)
    });
    
    const data = await res2.json();
    if (!res2.ok) return res.status(res2.status).json(data);
    
    res.json(data);
  } catch (error) { next(error); }
});

app.delete('/api/recalgrid/saved-searches/:id', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
    const userId = await ensureUser(req.deviceKey);
    
    await pool.query('delete from rg_saved_searches where id = $1 and user_id = $2', [req.params.id, userId]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// Enhanced search with explainability
app.post('/api/recalgrid/search/explain', requireDeviceKey, async (req, res, next) => {
  try {
    await requireDbReady();
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
               ts_rank(body_tsv, plainto_tsquery('english', $${params.length - 2})) as rank,
               'full_text' as match_type
        from rg_chunks
        where user_id = $1
          and body_tsv @@ plainto_tsquery('english', $${params.length - 1})
          ${tagClause}
        union all
        select id, title, source, tags, body, created_at,
               similarity(title, $${params.length - 2}) as rank,
               'fuzzy_title' as match_type
        from rg_chunks
        where user_id = $1 and title % $${params.length - 1}
          ${tagClause}
        union all
        select id, title, source, tags, body, created_at,
               0.5 as rank,
               'title_ilike' as match_type
        from rg_chunks
        where user_id = $1 and title ilike '%' || $${params.length - 1} || '%'
          ${tagClause}
        order by rank desc, created_at desc
        limit $${params.length}
      `;
      const ranked = await pool.query(rankQuery, params);
      
      const resultsWithExplanation = ranked.rows.map(row => ({
        ...row,
        match_explanation: getMatchExplanation(row.match_type, query, row.title, row.tags, tags)
      }));
      
      return res.json({ results: resultsWithExplanation });
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
    
    const resultsWithExplanation = all.rows.map(row => ({
      ...row,
      match_explanation: getMatchExplanation('all', query, row.title, row.tags, tags)
    }));
    
    res.json({ results: resultsWithExplanation });
  } catch (error) { next(error); }
});

function getMatchExplanation(matchType, query, title, chunkTags, searchTags) {
  const explanations = [];
  
  if (matchType === 'full_text') {
    explanations.push('Matched via full-text search in title or body');
  } else if (matchType === 'fuzzy_title') {
    explanations.push('Matched via fuzzy title search (typo-tolerant)');
  } else if (matchType === 'title_ilike') {
    explanations.push('Matched via case-insensitive title search');
  } else {
    explanations.push('Matched via general search (no specific query)');
  }
  
  if (searchTags && searchTags.length > 0) {
    const matchingTags = chunkTags.filter(tag => searchTags.includes(tag));
    if (matchingTags.length > 0) {
      explanations.push(`Matched ${matchingTags.length} of ${searchTags.length} required tags: ${matchingTags.join(', ')}`);
    }
  }
  
  if (query && title.toLowerCase().includes(query.toLowerCase())) {
    explanations.push('Query found exactly in title');
  }
  
  return explanations.join(' • ');
}

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`recalgrid listening on ${PORT}`));

module.exports = app;
