create extension if not exists pgcrypto;

create table if not exists users (
  uid text primary key,
  created_at timestamptz not null default now()
);

alter table users add column if not exists uid text;
alter table users add column if not exists created_at timestamptz not null default now();
create unique index if not exists idx_users_uid_unique on users(uid);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null references users(uid) on delete cascade,
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists room_members (
  room_id uuid not null references rooms(id) on delete cascade,
  uid text not null references users(uid) on delete cascade,
  role text not null check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key(room_id, uid)
);

create table if not exists room_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  created_by_uid text not null references users(uid) on delete cascade,
  title text not null,
  body text not null default '',
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_room_members_uid on room_members(uid);
create index if not exists idx_room_items_room_time on room_items(room_id, created_at desc);
