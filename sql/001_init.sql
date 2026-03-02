create extension if not exists pgcrypto;

create table if not exists users (
  uid text primary key,
  created_at timestamptz not null default now()
);

alter table users add column if not exists uid text;
alter table users add column if not exists created_at timestamptz not null default now();
create unique index if not exists idx_users_uid_unique on users(uid);

create table if not exists passes (
  id uuid primary key default gen_random_uuid(),
  uid text not null references users(uid) on delete cascade,
  display_name text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(uid)
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'General',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  uid text not null references users(uid) on delete cascade,
  location_id uuid not null references locations(id) on delete restrict,
  notes text not null default '',
  checked_in_at timestamptz not null default now()
);

create index if not exists idx_checkins_uid_time on checkins(uid, checked_in_at desc);
create index if not exists idx_locations_code on locations(code);

create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  uid text not null references users(uid) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
