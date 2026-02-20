-- Neon schema for Devin portfolio apps (anonymous / BYO-key).
-- Run this once in Neon SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- LingoLive
CREATE TABLE IF NOT EXISTS lingolive_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lingolive_items_client_created_idx
ON lingolive_items (client_id, created_at DESC);

-- Oracle Pit
CREATE TABLE IF NOT EXISTS oracle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oracle_items_client_created_idx
ON oracle_items (client_id, created_at DESC);

-- SleepyStory
CREATE TABLE IF NOT EXISTS sleepystory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sleepystory_items_client_created_idx
ON sleepystory_items (client_id, created_at DESC);

-- ToonStudio (projects only; demo download is gated by UI)
CREATE TABLE IF NOT EXISTS toon_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS toon_projects_client_created_idx
ON toon_projects (client_id, created_at DESC);


-- Generic per-app anonymous persistence (local-first)
create table if not exists nexus_appdata (
  app text not null,
  client_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (app, client_id)
);
create index if not exists nexus_appdata_updated_at_idx on nexus_appdata(updated_at desc);
