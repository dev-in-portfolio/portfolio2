import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.warn("DATABASE_URL is not set. VaultKey will fail until configured.");
}

export const pool = new Pool({ connectionString: DATABASE_URL });
