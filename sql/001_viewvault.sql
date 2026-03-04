create extension if not exists pgcrypto;

create table if not exists nvv_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists nuxt_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references nvv_users(id) on delete cascade,
  name text not null,
  route text not null default '/',
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create index if not exists idx_nuxt_views_user_route on nuxt_views(user_id, route);

insert into nvv_users (id, device_key, created_at)
select distinct v.user_id, 'migrated-' || v.user_id::text, now()
from nuxt_views v
left join nvv_users u on u.id = v.user_id
where u.id is null
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'nuxt_views'::regclass
      and contype = 'f'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'nuxt_views'::regclass and attname = 'user_id')
      ]
  loop
    execute format('alter table nuxt_views drop constraint %I', c.conname);
  end loop;
end $$;

alter table nuxt_views
  add constraint nuxt_views_user_id_fkey
  foreign key (user_id) references nvv_users(id) on delete cascade;
