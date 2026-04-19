import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_LEASE_SECONDS = 300;
const DEFAULT_LEASE_SECONDS = 30;

@Injectable()
export class JobsService {
  constructor(private db: DbService) {}

  async createJob(
    userId: string,
    type: string,
    payload: Record<string, any>,
    priority: number,
    maxAttempts: number
  ) {
    const payloadSize = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
    if (payloadSize > MAX_PAYLOAD_BYTES) {
      throw new BadRequestException('Payload too large.');
    }
    const created = await this.db.query(
      `insert into jobs (user_id, type, payload, priority, max_attempts)
       values ($1, $2, $3, $4, $5)
       returning id, type, payload, status, priority, attempts, max_attempts, run_after, created_at`,
      [userId, type, payload || {}, priority, maxAttempts]
    );
    return created.rows[0];
  }

  async listJobs(userId: string, status?: string, limit = 50) {
    const params: any[] = [userId];
    let clause = 'where user_id = $1';
    if (status) {
      params.push(status);
      clause += ` and status = $${params.length}`;
    }
    params.push(limit);
    const result = await this.db.query(
      `select id, type, status, priority, attempts, max_attempts, leased_until, lease_owner, last_error, run_after, created_at, updated_at
       from jobs
       ${clause}
       order by created_at desc
       limit $${params.length}`,
      params
    );
    return result.rows;
  }

  async getJob(userId: string, jobId: string) {
    const result = await this.db.query(
      `select id, type, payload, status, priority, attempts, max_attempts, leased_until, lease_owner, last_error, run_after, created_at, updated_at
       from jobs
       where id = $1 and user_id = $2`,
      [jobId, userId]
    );
    if (!result.rows.length) throw new NotFoundException('Job not found.');
    return result.rows[0];
  }

  async cancelJob(userId: string, jobId: string) {
    const result = await this.db.query(
      `update jobs
       set status = 'canceled', lease_owner = '', leased_until = null
       where id = $1 and user_id = $2 and status in ('queued','leased')`,
      [jobId, userId]
    );
    return { ok: (result.rowCount ?? 0) > 0 };
  }

  async leaseJobs(userId: string, workerId: string, leaseSeconds = DEFAULT_LEASE_SECONDS, limit = 1) {
    const lease = Math.min(Math.max(leaseSeconds, 1), MAX_LEASE_SECONDS);
    const take = Math.min(Math.max(limit, 1), 50);
    return this.db.withClient(async (client) => {
      await client.query('begin');
      try {
        const result = await client.query(
          `with candidate as (
             select id
             from jobs
             where user_id = $1
               and status in ('queued','leased')
               and run_after <= now()
               and (status = 'queued' or leased_until <= now())
             order by priority desc, created_at asc
             for update skip locked
             limit $2
           )
           update jobs j
           set status = 'leased',
               leased_until = now() + make_interval(secs => $3),
               lease_owner = $4
           from candidate
           where j.id = candidate.id
           returning j.id, j.type, j.payload, j.status, j.priority, j.attempts, j.max_attempts, j.leased_until, j.lease_owner, j.run_after, j.created_at, j.updated_at`,
          [userId, take, lease, workerId]
        );
        await client.query('commit');
        return result.rows;
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    });
  }

  async succeedJob(userId: string, jobId: string, workerId: string) {
    const result = await this.db.query(
      `update jobs
       set status = 'succeeded', lease_owner = '', leased_until = null, last_error = ''
       where id = $1 and user_id = $2 and status = 'leased' and lease_owner = $3`,
      [jobId, userId, workerId]
    );
    return { ok: (result.rowCount ?? 0) > 0 };
  }

  async failJob(userId: string, jobId: string, workerId: string, error: string, retry = true) {
    const job = await this.db.query(
      `select id, attempts, max_attempts
       from jobs
       where id = $1 and user_id = $2 and status = 'leased' and lease_owner = $3`,
      [jobId, userId, workerId]
    );
    if (!job.rows.length) throw new NotFoundException('Job not found.');

    const attempts = job.rows[0].attempts + 1;
    if (!retry || attempts >= job.rows[0].max_attempts) {
      const result = await this.db.query(
        `update jobs
         set status = 'failed', attempts = $1, last_error = $2, lease_owner = '', leased_until = null
         where id = $3`,
        [attempts, error, jobId]
      );
      return { ok: (result.rowCount ?? 0) > 0, status: 'failed', attempts };
    }

    const backoff = Math.min(300, Math.pow(2, attempts) * 5);
    const result = await this.db.query(
      `update jobs
       set status = 'queued',
           attempts = $1,
           last_error = $2,
           lease_owner = '',
           leased_until = null,
           run_after = now() + make_interval(secs => $3)
       where id = $4`,
      [attempts, error, backoff, jobId]
    );
    return { ok: (result.rowCount ?? 0) > 0, status: 'queued', attempts, backoffSeconds: backoff };
  }
}
