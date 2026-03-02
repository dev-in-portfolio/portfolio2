const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

module.exports = {
  pool,
  query
};
