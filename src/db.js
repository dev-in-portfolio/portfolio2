const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  console.warn('DATABASE_URL is not set. The app will fail on DB access.');
}

const useSsl = Boolean(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  query
};
