create extension if not exists pgcrypto;

create table if not exists ns_saved_queries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sql_text text not null,
  tags jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ns_query_audit (
  id uuid primary key default gen_random_uuid(),
  query_name text,
  sql_text text not null,
  row_count int not null default 0,
  duration_ms int not null default 0,
  created_at timestamptz not null default now()
);

-- Add index for tags column
create index if not exists idx_ns_saved_queries_tags on ns_saved_queries using gin(tags);
