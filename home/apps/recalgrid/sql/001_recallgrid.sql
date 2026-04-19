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
  notes text,
  confidence numeric,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rg_relationships (
  id uuid primary key default gen_random_uuid(),
  from_chunk_id uuid not null references rg_chunks(id) on delete cascade,
  to_chunk_id uuid not null references rg_chunks(id) on delete cascade,
  relationship_type text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(from_chunk_id, to_chunk_id, relationship_type)
);

create table if not exists rg_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rg_users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists rg_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references rg_collections(id) on delete cascade,
  chunk_id uuid not null references rg_chunks(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique(collection_id, chunk_id)
);

create table if not exists rg_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rg_users(id) on delete cascade,
  name text not null,
  search_query text not null,
  search_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table rg_chunks
  add column if not exists body_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;

create index if not exists idx_rg_chunks_tsv on rg_chunks using gin(body_tsv);
create index if not exists idx_rg_chunks_tags_gin on rg_chunks using gin(tags);
create index if not exists idx_rg_chunks_title_trgm on rg_chunks using gin(title gin_trgm_ops);
create index if not exists idx_rg_chunks_user_time on rg_chunks(user_id, created_at desc);
create index if not exists idx_rg_relationships_from on rg_relationships(from_chunk_id);
create index if not exists idx_rg_relationships_to on rg_relationships(to_chunk_id);
create index if not exists idx_rg_collections_user on rg_collections(user_id);
create index if not exists idx_rg_collection_items_collection on rg_collection_items(collection_id);
create index if not exists idx_rg_saved_searches_user on rg_saved_searches(user_id);
