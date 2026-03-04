import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. ViewVault API will fail until configured.');
}

export const pool = new Pool({ connectionString: DATABASE_URL });

let schemaReady: Promise<void> | null = null;

async function ensureViewVaultSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        create extension if not exists pgcrypto;

        create table if not exists nvv_users (
          id uuid primary key default gen_random_uuid(),
          device_key text not null unique,
          created_at timestamptz not null default now()
        );

        create table if not exists nuxt_views (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references nvv_users(id) on delete cascade,
          name text not null,
          route text not null default '/',
          state jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique(user_id, name)
        );

        create index if not exists idx_nuxt_views_user_route on nuxt_views(user_id, route);
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function getUserId(deviceKey: string) {
  await ensureViewVaultSchema();
  const { rows } = await pool.query(
    `insert into nvv_users (device_key)
     values ($1)
     on conflict (device_key) do update set device_key = excluded.device_key
     returning id`,
    [deviceKey]
  );
  return rows[0].id;
}
