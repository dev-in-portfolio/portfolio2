const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3138);
const DATABASE_URL =
  process.env.SCHEMAPULSE_DATABASE_URL ||
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
  await pool.query('insert into sp_users(device_key) values ($1) on conflict do nothing', [deviceKey]);
  const row = await pool.query('select id from sp_users where device_key = $1', [deviceKey]);
  return row.rows[0].id;
}

function topoSort(nodes, edges) {
  const incoming = new Map();
  const outgoing = new Map();
  nodes.forEach((n) => incoming.set(n, 0));
  edges.forEach(([s, d]) => {
    outgoing.set(s, [...(outgoing.get(s) || []), d]);
    incoming.set(d, (incoming.get(d) || 0) + 1);
    if (!incoming.has(s)) incoming.set(s, 0);
  });
  const queue = [...incoming.entries()].filter(([, v]) => v === 0).map(([k]) => k);
  const order = [];
  while (queue.length) {
    const n = queue.shift();
    order.push(n);
    for (const d of outgoing.get(n) || []) {
      incoming.set(d, incoming.get(d) - 1);
      if (incoming.get(d) === 0) queue.push(d);
    }
  }
  const remaining = [...incoming.keys()].filter((n) => !order.includes(n));
  return { order, remaining };
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

app.get('/api/schemapulse/tables', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      `select n.nspname as schema,
              c.relname as table,
              coalesce(s.n_live_tup, 0) as estimated_rows
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       left join pg_stat_user_tables s on s.relid = c.oid
       where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema')
       order by n.nspname, c.relname`
    );
    res.json({ tables: rows });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/columns', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const schema = String(req.query.schema || '');
    const table = String(req.query.table || '');
    if (!schema || !table) return res.status(400).json({ error: 'schema and table required' });
    const { rows } = await pool.query(
      `select column_name, data_type, is_nullable, column_default
       from information_schema.columns
       where table_schema = $1 and table_name = $2
       order by ordinal_position`,
      [schema, table]
    );
    res.json({ columns: rows });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/indexes', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const schema = String(req.query.schema || '');
    const table = String(req.query.table || '');
    if (!schema || !table) return res.status(400).json({ error: 'schema and table required' });
    const { rows } = await pool.query(
      `select indexname, indexdef
       from pg_indexes
       where schemaname = $1 and tablename = $2
       order by indexname`,
      [schema, table]
    );
    res.json({ indexes: rows });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/constraints', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const schema = String(req.query.schema || '');
    const table = String(req.query.table || '');
    if (!schema || !table) return res.status(400).json({ error: 'schema and table required' });
    const { rows } = await pool.query(
      `select con.conname,
              con.contype,
              pg_get_constraintdef(con.oid) as definition
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
       where ns.nspname = $1 and rel.relname = $2
       order by con.conname`,
      [schema, table]
    );
    res.json({ constraints: rows });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/fks', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const { rows } = await pool.query(
      `select ns.nspname as schema,
              rel.relname as table,
              ns2.nspname as ref_schema,
              rel2.relname as ref_table,
              con.conname,
              array_agg(att.attname order by u.ordinality) as columns,
              array_agg(att2.attname order by u.ordinality) as ref_columns
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
       join pg_class rel2 on rel2.oid = con.confrelid
       join pg_namespace ns2 on ns2.oid = rel2.relnamespace
       join unnest(con.conkey) with ordinality as u(attnum, ordinality) on true
       join pg_attribute att on att.attrelid = con.conrelid and att.attnum = u.attnum
       join unnest(con.confkey) with ordinality as u2(attnum, ordinality) on u.ordinality = u2.ordinality
       join pg_attribute att2 on att2.attrelid = con.confrelid and att2.attnum = u2.attnum
       where con.contype = 'f' and ns.nspname not in ('pg_catalog', 'information_schema')
       group by ns.nspname, rel.relname, ns2.nspname, rel2.relname, con.conname
       order by ns.nspname, rel.relname, con.conname`
    );
    res.json({ foreign_keys: rows });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/runbook', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const { rows: tables } = await pool.query(
      `select n.nspname as schema, c.relname as table
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema')
       order by n.nspname, c.relname`
    );
    const { rows: fks } = await pool.query(
      `select ns.nspname as schema, rel.relname as table,
              ns2.nspname as ref_schema, rel2.relname as ref_table
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
       join pg_class rel2 on rel2.oid = con.confrelid
       join pg_namespace ns2 on ns2.oid = rel2.relnamespace
       where con.contype = 'f' and ns.nspname not in ('pg_catalog', 'information_schema')`
    );

    const nodes = tables.map((t) => `${t.schema}.${t.table}`);
    const edges = fks.map((fk) => [`${fk.schema}.${fk.table}`, `${fk.ref_schema}.${fk.ref_table}`]);
    const { order, remaining } = topoSort(nodes, edges);
    const dropOrder = [...order].reverse();

    const lines = ['# SchemaPulse Runbook', '', '## Creation Order', ''];
    if (order.length) lines.push(...order.map((t, i) => `${i + 1}. ${t}`));
    else lines.push('No tables found.');

    if (remaining.length) {
      lines.push('', '## Cycles Detected', 'The following tables are in cycles and require manual ordering:');
      lines.push(...remaining.map((t) => `- ${t}`));
    }

    lines.push('', '## Dependency Map', '');
    if (edges.length) lines.push(...edges.map(([s, d]) => `- ${s} -> ${d}`));
    else lines.push('No foreign key dependencies found.');

    lines.push('', '## Drop Order', '');
    if (dropOrder.length) lines.push(...dropOrder.map((t, i) => `${i + 1}. ${t}`));
    else lines.push('No tables found.');

    res.type('text/markdown').send(lines.join('\n'));
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/readiness', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    await ensureUser(req.deviceKey);
    const { rows: ext } = await pool.query('select extname from pg_extension order by extname');
    const extensionSet = new Set(ext.map((e) => e.extname));

    const { rows: fkRows } = await pool.query(
      `select ns.nspname as schema, rel.relname as table,
              array_agg(att.attname order by u.ordinality) as columns
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
       join unnest(con.conkey) with ordinality as u(attnum, ordinality) on true
       join pg_attribute att on att.attrelid = con.conrelid and att.attnum = u.attnum
       where con.contype = 'f' and ns.nspname not in ('pg_catalog', 'information_schema')
       group by ns.nspname, rel.relname`
    );

    const missing = [];
    for (const fk of fkRows) {
      const { rows: idx } = await pool.query(
        `select array_agg(a.attname order by x.ordinality) as columns
         from pg_index i
         join pg_class tc on tc.oid = i.indrelid
         join pg_namespace ns on ns.oid = tc.relnamespace
         join unnest(i.indkey) with ordinality as x(attnum, ordinality) on true
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = x.attnum
         where ns.nspname = $1 and tc.relname = $2
         group by i.indexrelid`,
        [fk.schema, fk.table]
      );
      const fkCols = fk.columns || [];
      const hasIdx = idx.some((r) => {
        const cols = r.columns || [];
        return cols.slice(0, fkCols.length).join('|') === fkCols.join('|');
      });
      if (!hasIdx) missing.push(`${fk.schema}.${fk.table} (${fkCols.join(', ')})`);
    }

    res.json({
      extensions: [...extensionSet],
      has_pgcrypto: extensionSet.has('pgcrypto'),
      fk_index_missing: missing
    });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/migration-sets', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const { rows } = await pool.query('select id, name, created_at from sp_migration_sets where user_id = $1 order by created_at desc', [userId]);
    res.json({ sets: rows });
  } catch (error) { next(error); }
});

app.post('/api/schemapulse/migration-sets', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      `insert into sp_migration_sets (user_id, name)
       values ($1, $2)
       on conflict (user_id, name)
       do update set name = excluded.name
       returning id, name, created_at`,
      [userId, name]
    );
    res.status(201).json({ set: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/migration-sets/:setId/migrations', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from sp_migration_sets where id = $1 and user_id = $2', [req.params.setId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'set not found' });
    const { rows } = await pool.query(
      'select id, filename, sql_text, created_at from sp_migrations where set_id = $1 order by filename',
      [req.params.setId]
    );
    res.json({ migrations: rows });
  } catch (error) { next(error); }
});

app.post('/api/schemapulse/migration-sets/:setId/migrations', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from sp_migration_sets where id = $1 and user_id = $2', [req.params.setId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'set not found' });

    const filename = String(req.body.filename || '').trim();
    const sqlText = String(req.body.sql_text || '').trim();
    if (!filename || !sqlText) return res.status(400).json({ error: 'filename and sql_text required' });

    const { rows } = await pool.query(
      `insert into sp_migrations (set_id, filename, sql_text)
       values ($1, $2, $3)
       on conflict (set_id, filename)
       do update set sql_text = excluded.sql_text, created_at = now()
       returning id, filename, sql_text, created_at`,
      [req.params.setId, filename, sqlText]
    );
    res.status(201).json({ migration: rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/schemapulse/migration-sets/:setId/export', requireDeviceKey, async (req, res, next) => {
  try {
    requireDb();
    const userId = await ensureUser(req.deviceKey);
    const own = await pool.query('select 1 from sp_migration_sets where id = $1 and user_id = $2', [req.params.setId, userId]);
    if (!own.rows[0]) return res.status(404).json({ error: 'set not found' });

    const { rows } = await pool.query(
      'select filename, sql_text from sp_migrations where set_id = $1 order by filename',
      [req.params.setId]
    );

    if (!rows.length) return res.type('text/plain').send('No migrations found.');
    const combined = rows.map((m) => `-- ${m.filename}\n${m.sql_text}`).join('\n\n');
    res.type('text/plain').send(combined);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`schemapulse listening on ${PORT}`));

module.exports = app;
