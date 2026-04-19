import { Injectable } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DbService {
  private pool: Pool;

  constructor(private config: ConfigService) {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set.');
    }
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  }

  query<T extends QueryResultRow = any>(text: string, params: any[] = []) {
    return this.pool.query<T>(text, params);
  }
}
