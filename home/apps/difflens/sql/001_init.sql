create extension if not exists pgcrypto;

create table if not exists diff_runs (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  mode text not null check (mode in ('text','json')),
  granularity text not null default 'line' check (granularity in ('line','word','path')),
  a_hash text not null,
  b_hash text not null,
  a_size int not null,
  b_size int not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_diff_runs_user_time
  on diff_runs(user_key, created_at desc);

create index if not exists idx_diff_runs_hashes
  on diff_runs(a_hash, b_hash);
