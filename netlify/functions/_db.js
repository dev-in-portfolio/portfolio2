import { Client } from "pg";

export async function getClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  if (!connectionString) return null;
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}
