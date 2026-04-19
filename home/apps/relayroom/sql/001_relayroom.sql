create extension if not exists pgcrypto;

create table if not exists rr_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists rr_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references rr_users(id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists rr_room_members (
  room_id uuid not null references rr_rooms(id) on delete cascade,
  user_id uuid not null references rr_users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key(room_id, user_id)
);

create table if not exists rr_room_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rr_rooms(id) on delete cascade,
  user_id uuid not null references rr_users(id) on delete cascade,
  title text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rr_members_user on rr_room_members(user_id);
create index if not exists idx_rr_notes_room_time on rr_room_notes(room_id, created_at desc);
