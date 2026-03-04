create extension if not exists pgcrypto;

create table if not exists sp_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists sp_migration_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references sp_users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists sp_migrations (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references sp_migration_sets(id) on delete cascade,
  filename text not null,
  sql_text text not null,
  created_at timestamptz not null default now(),
  unique(set_id, filename)
);
