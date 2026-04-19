create extension if not exists pgcrypto;

create table if not exists dfl_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists dfl_flow_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references dfl_users(id) on delete cascade,
  entity_id text not null,
  stage text not null,
  entered_at timestamptz not null,
  exited_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_dfl_flow_user_entity on dfl_flow_events(user_id, entity_id);
create index if not exists idx_dfl_flow_user_stage on dfl_flow_events(user_id, stage);
create index if not exists idx_dfl_flow_user_time on dfl_flow_events(user_id, entered_at);
