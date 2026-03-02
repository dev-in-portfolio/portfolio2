import 'server-only';
import { Pool } from 'pg';

let pool: Pool | null = null;
let dbError = '';

export function getPool() {
  if (pool) return pool;
  const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  if (!databaseUrl) {
    dbError = 'DATABASE_URL is not set.';
    return null;
  }
  pool = new Pool({ connectionString: databaseUrl, max: 5 });
  return pool;
}

export function getDbError() {
  return dbError;
}
