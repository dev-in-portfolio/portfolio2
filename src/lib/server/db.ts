import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg as { Pool: any };

const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || '';

let pool: any | null = null;
let dbError: string | null = null;

if (!databaseUrl) {
  dbError = 'DATABASE_URL is not set.';
  console.warn(dbError);
} else {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  } catch (error) {
    dbError = 'Failed to initialize database connection.';
    console.warn(dbError, error);
  }
}

export function getPool() {
  return pool;
}

export function getDbError() {
  return dbError;
}
