create extension if not exists pgcrypto;

create table if not exists nsg_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists nsg_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references nsg_users(id) on delete cascade,
  name text not null,
  kind text not null default 'generic',
  status text not null default 'ok' check (status in ('ok','warn','bad')),
  note text not null default '',
  value_num numeric(14,4) null,
  value_unit text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists nsg_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references nsg_users(id) on delete cascade,
  signal_id uuid not null references nsg_signals(id) on delete cascade,
  warn_if_gt numeric(14,4) null,
  warn_if_lt numeric(14,4) null,
  bad_if_gt numeric(14,4) null,
  bad_if_lt numeric(14,4) null,
  created_at timestamptz not null default now(),
  unique(user_id, signal_id)
);

create index if not exists idx_nsg_signals_user_status on nsg_signals(user_id, status);
create index if not exists idx_nsg_signals_user_updated on nsg_signals(user_id, updated_at desc);

-- If earlier migrations created nsg_signals/nsg_rules against a shared "users" table,
-- preserve existing user ids in nsg_users and re-point foreign keys.
insert into nsg_users (id, device_key, created_at)
select distinct s.user_id, 'migrated-' || s.user_id::text, now()
from nsg_signals s
left join nsg_users u on u.id = s.user_id
where u.id is null
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'nsg_signals'::regclass
      and contype = 'f'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'nsg_signals'::regclass and attname = 'user_id')
      ]
  loop
    execute format('alter table nsg_signals drop constraint %I', c.conname);
  end loop;
end $$;

alter table nsg_signals
  add constraint nsg_signals_user_id_fkey
  foreign key (user_id) references nsg_users(id) on delete cascade;

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'nsg_rules'::regclass
      and contype = 'f'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'nsg_rules'::regclass and attname = 'user_id')
      ]
  loop
    execute format('alter table nsg_rules drop constraint %I', c.conname);
  end loop;
end $$;

alter table nsg_rules
  add constraint nsg_rules_user_id_fkey
  foreign key (user_id) references nsg_users(id) on delete cascade;
