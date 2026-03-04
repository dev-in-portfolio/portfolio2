create extension if not exists pgcrypto;

create table if not exists sv_users (
  id uuid primary key default gen_random_uuid(),
  device_key text unique not null,
  created_at timestamptz default now()
);

create table if not exists sv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references sv_users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

create table if not exists sv_snapshots (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references sv_documents(id) on delete cascade,
  version integer not null,
  body text not null,
  summary text not null default '',
  diff_added integer not null default 0,
  diff_removed integer not null default 0,
  created_at timestamptz default now(),
  unique(document_id, version)
);

create index if not exists idx_docs_user
  on sv_documents(user_id);

create index if not exists idx_snapshots_doc_version
  on sv_snapshots(document_id, version desc);
