create extension if not exists pgcrypto;

create table if not exists sg_schemas (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  name text not null,
  version int not null default 1,
  schema jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_key, name, version)
);

create table if not exists sg_validation_runs (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  schema_name text not null,
  schema_version int not null,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sg_schemas_user_name on sg_schemas(user_key, name);
create index if not exists idx_sg_validation_runs_user_time on sg_validation_runs(user_key, created_at desc);
create index if not exists idx_sg_validation_runs_schema on sg_validation_runs(user_key, schema_name, schema_version);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'schemas'
  ) then
    insert into sg_schemas (user_key, name, version, schema, notes, created_at)
    select user_key, name, version, schema, notes, created_at
    from schemas
    on conflict (user_key, name, version) do nothing;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'validation_runs'
  ) then
    insert into sg_validation_runs (user_key, schema_name, schema_version, payload, result, created_at)
    select user_key, schema_name, schema_version, payload, result, created_at
    from validation_runs
    on conflict do nothing;
  end if;
end $$;
