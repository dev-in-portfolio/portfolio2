const { Pool } = require("pg");

let _pool;

/**
 * Uses Netlify-provided env var NETLIFY_DATABASE_URL (pooled).
 * If you ever need unpooled for migrations, use NETLIFY_DATABASE_URL_UNPOOLED.
 */
function getPool() {
  if (_pool) return _pool;

  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing DB connection string. Expected NETLIFY_DATABASE_URL (from Netlify Neon integration)."
    );
  }

  _pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
  });

  return _pool;
}

async function query(text, params) {
  const pool = getPool();
  return pool.query(text, params);
}

module.exports = { getPool, query };
