const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3121);
const DATABASE_URL =
  process.env.QUEUEGAUGE_DATABASE_URL ||
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
app.use(express.json({ limit: '256kb' }));
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) req.url = '/';
  else if (req.url.startsWith(`${fnPrefix}/`)) req.url = req.url.slice(fnPrefix.length);
  next();
});

function requireDb() {
  if (!pool) {
    const error = new Error('DATABASE_URL not configured');
    error.status = 500;
    throw error;
  }
}

async function getUserId(deviceKey) {
  const { rows } = await pool.query(
    `insert into qg_users (device_key)
     values ($1)
     on conflict (device_key) do update set device_key = excluded.device_key
     returning id`,
    [deviceKey]
  );
  return rows[0].id;
}

function requireDeviceKey(req, res, next) {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey) return res.status(400).json({ error: 'Missing X-Device-Key header' });
  req.deviceKey = deviceKey;
  next();
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

app.use('/api/queuegauge', requireDeviceKey);

app.get('/api/queuegauge/stats', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const { rows } = await pool.query(
      `select status, count(*)::int as count from qg_jobs where user_id = $1 group by status order by status`,
      [userId]
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/queuegauge/jobs', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const status = req.query.status ? String(req.query.status) : '';
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const params = [userId];
    let where = 'where user_id = $1';
    if (status) {
      params.push(status);
      where += ` and status = $${params.length}`;
    }
    params.push(limit);
    const { rows } = await pool.query(
      `select id, type, payload, status, priority, attempts, max_attempts, leased_until, lease_owner, last_error, run_after, created_at, updated_at
       from qg_jobs ${where} order by created_at desc limit $${params.length}`,
      params
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/queuegauge/jobs', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const type = String(req.body.type || '').trim().slice(0, 120);
    if (!type) return res.status(400).json({ error: 'type required' });
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const priority = Number(req.body.priority || 0);
    const maxAttempts = Math.min(20, Math.max(1, Number(req.body.maxAttempts || 3)));
    const { rows } = await pool.query(
      `insert into qg_jobs (user_id, type, payload, priority, max_attempts)
       values ($1, $2, $3, $4, $5)
       returning id, type, payload, status, priority, attempts, max_attempts, created_at`,
      [userId, type, payload, priority, maxAttempts]
    );
    res.status(201).json({ job: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/queuegauge/lease', async (req, res, next) => {
  const client = await pool.connect();
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const owner = String(req.body.owner || 'worker-1').slice(0, 100);
    const ttlSeconds = Math.min(600, Math.max(10, Number(req.body.ttlSeconds || 60)));
    await client.query('begin');
    const pick = await client.query(
      `select id from qg_jobs
       where user_id = $1 and status = 'queued' and run_after <= now()
       order by priority desc, created_at asc
       for update skip locked
       limit 1`,
      [userId]
    );
    if (!pick.rows[0]) {
      await client.query('commit');
      return res.json({ leased: null });
    }
    const { rows } = await client.query(
      `update qg_jobs
       set status = 'leased', lease_owner = $1, leased_until = now() + ($2 || ' seconds')::interval, updated_at = now()
       where id = $3
       returning id, type, payload, status, lease_owner, leased_until`,
      [owner, String(ttlSeconds), pick.rows[0].id]
    );
    await client.query('commit');
    res.json({ leased: rows[0] });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/queuegauge/jobs/:id/complete', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const out = await pool.query(
      `update qg_jobs set status = 'succeeded', lease_owner = '', leased_until = null, updated_at = now()
       where id = $1 and user_id = $2 returning id`,
      [req.params.id, userId]
    );
    if (!out.rows[0]) return res.status(404).json({ error: 'job not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/queuegauge/jobs/:id/fail', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const reason = String(req.body.error || 'failed').slice(0, 1000);
    const row = await pool.query('select attempts, max_attempts from qg_jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!row.rows[0]) return res.status(404).json({ error: 'job not found' });
    const attempts = Number(row.rows[0].attempts) + 1;
    const maxAttempts = Number(row.rows[0].max_attempts);
    const nextStatus = attempts >= maxAttempts ? 'failed' : 'queued';
    await pool.query(
      `update qg_jobs
       set status = $1, attempts = $2, last_error = $3, lease_owner = '', leased_until = null,
           run_after = case when $1 = 'queued' then now() + interval '30 seconds' else run_after end,
           updated_at = now()
       where id = $4 and user_id = $5`,
      [nextStatus, attempts, reason, req.params.id, userId]
    );
    res.json({ ok: true, status: nextStatus, attempts, maxAttempts });
  } catch (error) {
    next(error);
  }
});

// Enhanced job creation with scheduling and metadata
app.post('/api/queuegauge/jobs/enhanced', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const type = String(req.body.type || '').trim().slice(0, 120);
    if (!type) return res.status(400).json({ error: 'type required' });
    
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const priority = Number(req.body.priority || 0);
    const maxAttempts = Math.min(20, Math.max(1, Number(req.body.maxAttempts || 3)));
    const runAfter = req.body.runAfter ? new Date(req.body.runAfter) : null;
    const tags = Array.isArray(req.body.tags) ? req.body.tags.slice(0, 10) : [];
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
    
    const { rows } = await pool.query(
      `insert into qg_jobs (user_id, type, payload, priority, max_attempts, run_after, tags, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, type, payload, status, priority, attempts, max_attempts, run_after, tags, metadata, created_at`,
      [userId, type, payload, priority, maxAttempts, runAfter, tags, metadata]
    );
    res.status(201).json({ job: rows[0] });
  } catch (error) {
    next(error);
  }
});

// Bulk job operations
app.post('/api/queuegauge/jobs/bulk', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const jobs = Array.isArray(req.body.jobs) ? req.body.jobs : [];
    
    if (jobs.length === 0 || jobs.length > 50) {
      return res.status(400).json({ error: '1-50 jobs required' });
    }
    
    const results = [];
    for (const job of jobs) {
      try {
        const type = String(job.type || '').trim().slice(0, 120);
        if (!type) throw new Error('type required');
        
        const payload = job.payload && typeof job.payload === 'object' ? job.payload : {};
        const priority = Number(job.priority || 0);
        const maxAttempts = Math.min(20, Math.max(1, Number(job.maxAttempts || 3)));
        const runAfter = job.runAfter ? new Date(job.runAfter) : null;
        const tags = Array.isArray(job.tags) ? job.tags.slice(0, 10) : [];
        const metadata = job.metadata && typeof job.metadata === 'object' ? job.metadata : {};
        
        const { rows } = await pool.query(
          `insert into qg_jobs (user_id, type, payload, priority, max_attempts, run_after, tags, metadata)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning id, type, status, created_at`,
          [userId, type, payload, priority, maxAttempts, runAfter, tags, metadata]
        );
        results.push({ success: true, job: rows[0] });
      } catch (error) {
        results.push({ success: false, error: error.message, job });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.status(201).json({ results, successCount, totalCount: jobs.length });
  } catch (error) {
    next(error);
  }
});

// Job search and filtering
app.get('/api/queuegauge/jobs/search', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const status = req.query.status ? String(req.query.status) : '';
    const type = req.query.type ? String(req.query.type) : '';
    const tag = req.query.tag ? String(req.query.tag) : '';
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    
    const params = [userId];
    let where = 'where user_id = $1';
    let paramCount = 1;
    
    if (status) {
      params.push(status);
      paramCount++;
      where += ` and status = $${paramCount}`;
    }
    
    if (type) {
      params.push(type);
      paramCount++;
      where += ` and type = $${paramCount}`;
    }
    
    if (tag) {
      params.push(tag);
      paramCount++;
      where += ` and $${paramCount} = ANY(tags)`;
    }
    
    params.push(limit);
    paramCount++;
    
    const { rows } = await pool.query(
      `select id, type, payload, status, priority, attempts, max_attempts, leased_until, lease_owner, last_error, run_after, tags, metadata, created_at, updated_at
       from qg_jobs ${where} order by created_at desc limit $${paramCount}`,
      params
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

// Job metrics and analytics
app.get('/api/queuegauge/metrics', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    
    // Status distribution
    const statusDist = await pool.query(
      `select status, count(*)::int as count from qg_jobs where user_id = $1 group by status order by status`,
      [userId]
    );
    
    // Type distribution
    const typeDist = await pool.query(
      `select type, count(*)::int as count from qg_jobs where user_id = $1 group by type order by count desc limit 10`,
      [userId]
    );
    
    // Failure rate
    const totalJobs = await pool.query('select count(*)::int as count from qg_jobs where user_id = $1', [userId]);
    const failedJobs = await pool.query('select count(*)::int as count from qg_jobs where user_id = $1 and status = $2', [userId, 'failed']);
    
    // Oldest queued job
    const oldestQueued = await pool.query(
      `select id, type, created_at from qg_jobs where user_id = $1 and status = 'queued' order by created_at asc limit 1`,
      [userId]
    );
    
    // Recent activity
    const recentActivity = await pool.query(
      `select date_trunc('hour', created_at) as hour, status, count(*)::int as count
       from qg_jobs where user_id = $1 and created_at > now() - interval '24 hours'
       group by hour, status order by hour desc`,
      [userId]
    );
    
    res.json({
      statusDistribution: statusDist.rows,
      typeDistribution: typeDist.rows,
      totalJobs: totalJobs.rows[0].count,
      failedJobs: failedJobs.rows[0].count,
      failureRate: totalJobs.rows[0].count > 0 ? Math.round((failedJobs.rows[0].count / totalJobs.rows[0].count) * 100) : 0,
      oldestQueuedJob: oldestQueued.rows[0] || null,
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    next(error);
  }
});

// Job retry with backoff
app.post('/api/queuegauge/jobs/:id/retry', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const delaySeconds = Math.min(3600, Math.max(10, Number(req.body.delaySeconds || 30)));
    
    const job = await pool.query('select id, status, attempts from qg_jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!job.rows[0]) return res.status(404).json({ error: 'job not found' });
    
    if (job.rows[0].status !== 'failed') {
      return res.status(400).json({ error: 'only failed jobs can be retried' });
    }
    
    await pool.query(
      `update qg_jobs
       set status = 'queued', attempts = attempts + 1, last_error = '', lease_owner = '', leased_until = null,
           run_after = now() + ($1 || ' seconds')::interval, updated_at = now()
       where id = $2 and user_id = $3`,
      [String(delaySeconds), req.params.id, userId]
    );
    
    res.json({ ok: true, status: 'queued', runAfter: delaySeconds });
  } catch (error) {
    next(error);
  }
});

// Bulk retry
app.post('/api/queuegauge/jobs/bulk/retry', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const jobIds = Array.isArray(req.body.jobIds) ? req.body.jobIds : [];
    const delaySeconds = Math.min(3600, Math.max(10, Number(req.body.delaySeconds || 30)));
    
    if (jobIds.length === 0 || jobIds.length > 20) {
      return res.status(400).json({ error: '1-20 job IDs required' });
    }
    
    const results = [];
    for (const jobId of jobIds) {
      try {
        const job = await pool.query('select id, status from qg_jobs where id = $1 and user_id = $2', [jobId, userId]);
        if (!job.rows[0]) {
          results.push({ success: false, jobId, error: 'job not found' });
          continue;
        }
        
        if (job.rows[0].status !== 'failed') {
          results.push({ success: false, jobId, error: 'only failed jobs can be retried' });
          continue;
        }
        
        await pool.query(
          `update qg_jobs
           set status = 'queued', attempts = attempts + 1, last_error = '', lease_owner = '', leased_until = null,
               run_after = now() + ($1 || ' seconds')::interval, updated_at = now()
           where id = $2 and user_id = $3`,
          [String(delaySeconds), jobId, userId]
        );
        
        results.push({ success: true, jobId, status: 'queued' });
      } catch (error) {
        results.push({ success: false, jobId, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({ results, successCount, totalCount: jobIds.length });
  } catch (error) {
    next(error);
  }
});

// Job cancellation
app.post('/api/queuegauge/jobs/:id/cancel', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    
    const job = await pool.query('select id, status from qg_jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!job.rows[0]) return res.status(404).json({ error: 'job not found' });
    
    if (job.rows[0].status === 'succeeded' || job.rows[0].status === 'failed') {
      return res.status(400).json({ error: 'completed jobs cannot be cancelled' });
    }
    
    await pool.query(
      `update qg_jobs
       set status = 'cancelled', lease_owner = '', leased_until = null, updated_at = now()
       where id = $1 and user_id = $2`,
      [req.params.id, userId]
    );
    
    res.json({ ok: true, status: 'cancelled' });
  } catch (error) {
    next(error);
  }
});

// Enhanced lease with filtering
app.post('/api/queuegauge/lease/filtered', async (req, res, next) => {
  const client = await pool.connect();
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const owner = String(req.body.owner || 'worker-1').slice(0, 100);
    const ttlSeconds = Math.min(600, Math.max(10, Number(req.body.ttlSeconds || 60)));
    const jobType = req.body.type ? String(req.body.type).slice(0, 120) : '';
    
    await client.query('begin');
    
    let pickQuery = `
      select id from qg_jobs
      where user_id = $1 and status = 'queued' and run_after <= now()
      order by priority desc, created_at asc
      for update skip locked
      limit 1
    `;
    const params = [userId];
    
    if (jobType) {
      pickQuery = `
        select id from qg_jobs
        where user_id = $1 and status = 'queued' and type = $2 and run_after <= now()
        order by priority desc, created_at asc
        for update skip locked
        limit 1
      `;
      params.push(jobType);
    }
    
    const pick = await client.query(pickQuery, params);
    
    if (!pick.rows[0]) {
      await client.query('commit');
      return res.json({ leased: null });
    }
    
    const { rows } = await client.query(
      `update qg_jobs
       set status = 'leased', lease_owner = $1, leased_until = now() + ($2 || ' seconds')::interval, updated_at = now()
       where id = $3
       returning id, type, payload, status, lease_owner, leased_until, priority, attempts, max_attempts, tags, metadata`,
      [owner, String(ttlSeconds), pick.rows[0].id]
    );
    
    await client.query('commit');
    res.json({ leased: rows[0] });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

// Job priority update
app.post('/api/queuegauge/jobs/:id/priority', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const priority = Number(req.body.priority || 0);
    
    const job = await pool.query('select id, status from qg_jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!job.rows[0]) return res.status(404).json({ error: 'job not found' });
    
    if (job.rows[0].status !== 'queued') {
      return res.status(400).json({ error: 'only queued jobs can have priority updated' });
    }
    
    await pool.query(
      `update qg_jobs
       set priority = $1, updated_at = now()
       where id = $2 and user_id = $3`,
      [priority, req.params.id, userId]
    );
    
    res.json({ ok: true, priority });
  } catch (error) {
    next(error);
  }
});

// Job notes and annotations
app.post('/api/queuegauge/jobs/:id/notes', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const notes = String(req.body.notes || '').slice(0, 2000);
    
    const job = await pool.query('select id from qg_jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!job.rows[0]) return res.status(404).json({ error: 'job not found' });
    
    await pool.query(
      `update qg_jobs
       set notes = $1, updated_at = now()
       where id = $2 and user_id = $3`,
      [notes, req.params.id, userId]
    );
    
    res.json({ ok: true, notes });
  } catch (error) {
    next(error);
  }
});

// Job tags management
app.post('/api/queuegauge/jobs/:id/tags', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const tags = Array.isArray(req.body.tags) ? req.body.tags.slice(0, 10) : [];
    
    const job = await pool.query('select id from qg_jobs where id = $1 and user_id = $2', [req.params.id, userId]);
    if (!job.rows[0]) return res.status(404).json({ error: 'job not found' });
    
    await pool.query(
      `update qg_jobs
       set tags = $1, updated_at = now()
       where id = $2 and user_id = $3`,
      [tags, req.params.id, userId]
    );
    
    res.json({ ok: true, tags });
  } catch (error) {
    next(error);
  }
});

// Get all tags
app.get('/api/queuegauge/tags', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    
    const { rows } = await pool.query(
      `select distinct unnest(tags) as tag from qg_jobs where user_id = $1 and tags is not null order by tag`,
      [userId]
    );
    
    res.json({ tags: rows.map(row => row.tag) });
  } catch (error) {
    next(error);
  }
});

// Job export
app.post('/api/queuegauge/export', async (req, res, next) => {
  try {
    requireDb();
    const userId = await getUserId(req.deviceKey);
    const statusFilter = req.body.status ? String(req.body.status) : '';
    const typeFilter = req.body.type ? String(req.body.type) : '';
    const format = req.body.format || 'json';
    
    const params = [userId];
    let where = 'where user_id = $1';
    let paramCount = 1;
    
    if (statusFilter) {
      params.push(statusFilter);
      paramCount++;
      where += ` and status = $${paramCount}`;
    }
    
    if (typeFilter) {
      params.push(typeFilter);
      paramCount++;
      where += ` and type = $${paramCount}`;
    }
    
    const { rows } = await pool.query(
      `select id, type, payload, status, priority, attempts, max_attempts, leased_until, lease_owner, last_error, run_after, tags, metadata, notes, created_at, updated_at
       from qg_jobs ${where} order by created_at desc`,
      params
    );
    
    if (format === 'csv') {
      const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
      const lines = ['id,type,status,priority,attempts,max_attempts,created_at,updated_at'];
      for (const r of rows) {
        lines.push([
          r.id, r.type, r.status, r.priority, r.attempts, r.max_attempts,
          r.created_at, r.updated_at
        ].map(esc).join(','));
      }
      res.type('text/csv').send(lines.join('\n'));
      return;
    }
    
    res.json({ jobs: rows });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'server_error' : 'request_error', detail: error.message });
});

if (require.main === module) app.listen(PORT, () => console.log(`queuegauge listening on ${PORT}`));

module.exports = app;
