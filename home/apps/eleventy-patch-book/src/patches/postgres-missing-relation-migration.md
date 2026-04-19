---
slug: postgres-missing-relation-migration
title: "Postgres: relation does not exist after deploy"
tags: ["postgres", "migration", "deploy", "schema"]
applies_to: ["postgres", "netlify"]
risk: "high"
permalink: false
---

## Symptom
Runtime errors such as `relation \"table_name\" does not exist`.

## Patch
```patch
TARGET FILE: deployment runbook

FIND:
(no migration step)

REPLACE WITH:
Apply schema SQL before/after first deploy:
psql "$DATABASE_URL" -f sql/001_init.sql
```

## Notes
Treat schema migration as mandatory release step for DB-backed apps.
