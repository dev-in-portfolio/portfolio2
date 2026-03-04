create extension if not exists pgcrypto;

create table if not exists tf_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists tf_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references tf_users(id) on delete cascade,
  name text not null,
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tf_presets_user_time
  on tf_presets(user_id, created_at desc);

create or replace function tf_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_tf_touch on tf_presets;
create trigger trg_tf_touch
before update on tf_presets
for each row execute function tf_touch_updated_at();
