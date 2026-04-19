create extension if not exists pgcrypto;

create table if not exists sealed_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tags text[] not null default '{}',
  salt bytea not null,
  iv bytea not null,
  ciphertext bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sealed_entries_time on sealed_entries(created_at desc);
create index if not exists idx_sealed_entries_tags on sealed_entries using gin(tags);
