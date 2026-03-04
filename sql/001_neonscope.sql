create extension if not exists pgcrypto;

create table if not exists ns_saved_queries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sql_text text not null,
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
