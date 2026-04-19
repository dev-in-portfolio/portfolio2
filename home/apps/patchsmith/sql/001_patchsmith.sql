create extension if not exists pgcrypto;

create table if not exists ps_users (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists ps_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references ps_users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists ps_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ps_projects(id) on delete cascade,
  path text not null,
  content text not null,
  content_hash text,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(project_id, path)
);

create table if not exists ps_patches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references ps_projects(id) on delete cascade,
  file_path text not null,
  file_version integer not null,
  find_text text not null,
  replace_text text not null,
  status text not null default 'draft' check (status in ('draft','approved','applied','rejected')),
  confidence numeric,
  reviewer_notes text,
  patch_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ps_patch_history (
  id uuid primary key default gen_random_uuid(),
  patch_id uuid not null references ps_patches(id) on delete cascade,
  status text not null,
  reviewer_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ps_patches_project_status on ps_patches(project_id, status);
create index if not exists idx_ps_patches_project_file on ps_patches(project_id, file_path);
create index if not exists idx_ps_patch_history_patch on ps_patch_history(patch_id);
