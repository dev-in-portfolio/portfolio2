import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class DashboardService {
  constructor(private db: DbService) {}

  async summary(userId: string) {
    const counts = await this.db.query(
      `select status, count(*)::int as count
       from jobs
       where user_id = $1
       group by status`,
      [userId]
    );
    const oldest = await this.db.query(
      `select extract(epoch from (now() - min(created_at)))::int as age
       from jobs
       where user_id = $1 and status = 'queued'`,
      [userId]
    );
    const failures = await this.db.query(
      `select count(*)::int as count
       from jobs
       where user_id = $1 and status = 'failed'`,
      [userId]
    );
    const recentFailures = await this.db.query(
      `select id, type, last_error, updated_at
       from jobs
       where user_id = $1 and status = 'failed'
       order by updated_at desc
       limit 5`,
      [userId]
    );
    return {
      counts: counts.rows,
      oldestQueuedAgeSeconds: oldest.rows[0]?.age ?? null,
      failedTotal: failures.rows[0]?.count ?? 0,
      recentFailures: recentFailures.rows
    };
  }

  async failures(userId: string, limit = 50) {
    const result = await this.db.query(
      `select id, type, attempts, max_attempts, last_error, updated_at
       from jobs
       where user_id = $1 and status = 'failed'
       order by updated_at desc
       limit $2`,
      [userId, limit]
    );
    return result.rows;
  }
}
