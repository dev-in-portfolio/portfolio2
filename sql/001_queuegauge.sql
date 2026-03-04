create extension if not exists pgcrypto;

create table if not exists qg_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'qg_job_status') then
    create type public.qg_job_status as enum ('queued','leased','succeeded','failed','canceled');
  end if;
end $$;

create table if not exists qg_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references qg_users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.qg_job_status not null default 'queued',
  priority int not null default 0,
  attempts int not null default 0,
  max_attempts int not null default 3,
  leased_until timestamptz null,
  lease_owner text not null default '',
  last_error text not null default '',
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_user_status
  on qg_jobs(user_id, status);

create index if not exists idx_jobs_user_run_after
  on qg_jobs(user_id, run_after);

create index if not exists idx_jobs_lease
  on qg_jobs(status, leased_until);

create or replace function qg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_qg_jobs_touch on qg_jobs;
create trigger trg_qg_jobs_touch
before update on qg_jobs
for each row execute function qg_touch_updated_at();
