import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. CardPress API will fail until configured.');
}

export const pool = new Pool({ connectionString: DATABASE_URL });

let schemaReady: Promise<void> | null = null;

async function ensureCardPressSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        create extension if not exists pgcrypto;

        create table if not exists ncp_users (
          id uuid primary key default gen_random_uuid(),
          device_key text not null unique,
          created_at timestamptz not null default now()
        );

        create table if not exists ncp_pages (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references ncp_users(id) on delete cascade,
          title text not null,
          slug text not null,
          status text not null default 'draft' check (status in ('draft','published')),
          published_slug text null unique,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique(user_id, slug)
        );

        create table if not exists ncp_cards (
          id uuid primary key default gen_random_uuid(),
          page_id uuid not null references ncp_pages(id) on delete cascade,
          type text not null check (type in ('text','image','embed','quote')),
          ord int not null,
          title text not null default '',
          body text not null default '',
          image_url text not null default '',
          embed_url text not null default '',
          created_at timestamptz not null default now(),
          unique(page_id, ord)
        );

        create index if not exists idx_ncp_pages_user_status on ncp_pages(user_id, status, updated_at desc);
        create index if not exists idx_ncp_cards_page_ord on ncp_cards(page_id, ord);
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function getUserId(deviceKey: string) {
  await ensureCardPressSchema();
  const { rows } = await pool.query(
    `insert into ncp_users (device_key)
     values ($1)
     on conflict (device_key) do update set device_key = excluded.device_key
     returning id`,
    [deviceKey]
  );
  return rows[0].id;
}
