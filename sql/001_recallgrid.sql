create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists rg_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists rg_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rg_users(id) on delete cascade,
  title text not null,
  source text not null default '',
  tags text[] not null default '{}',
  body text not null,
  created_at timestamptz not null default now()
);

alter table rg_chunks
  add column if not exists body_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;

create index if not exists idx_rg_chunks_tsv on rg_chunks using gin(body_tsv);
create index if not exists idx_rg_chunks_tags_gin on rg_chunks using gin(tags);
create index if not exists idx_rg_chunks_title_trgm on rg_chunks using gin(title gin_trgm_ops);
create index if not exists idx_rg_chunks_user_time on rg_chunks(user_id, created_at desc);
