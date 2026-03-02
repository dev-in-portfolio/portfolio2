create extension if not exists pgcrypto;

create table if not exists users (
  uid text primary key,
  created_at timestamptz not null default now()
);

alter table users add column if not exists uid text;
alter table users add column if not exists created_at timestamptz not null default now();
create unique index if not exists idx_users_uid_unique on users(uid);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  uid text not null references users(uid) on delete cascade,
  title text not null default '',
  vendor text not null default '',
  amount_cents int null,
  receipt_date date null,
  storage_path text null,
  mime_type text null,
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  uid text not null references users(uid) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(uid, name)
);

create table if not exists receipt_tags (
  receipt_id uuid not null references receipts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key(receipt_id, tag_id)
);

create index if not exists idx_receipts_uid_time on receipts(uid, created_at desc);
create index if not exists idx_receipts_uid_vendor on receipts(uid, vendor);
create index if not exists idx_tags_uid on tags(uid, name);
