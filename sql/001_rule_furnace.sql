create extension if not exists pgcrypto;

create table if not exists rf_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists rf_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rf_users(id) on delete cascade,
  name text not null,
  priority int not null default 0,
  is_enabled boolean not null default true,
  when_expr text not null,
  then_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists rf_test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rf_users(id) on delete cascade,
  input_json jsonb not null,
  matched_rule_ids uuid[] not null default '{}',
  output_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_rf_rules_user_priority on rf_rules(user_id, priority desc);
create index if not exists idx_rf_runs_user_time on rf_test_runs(user_id, created_at desc);
