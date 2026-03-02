const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5
    });
  }
  return pool;
}

module.exports = { getPool };
