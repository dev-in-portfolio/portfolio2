---
slug: pg-pool-commonjs
title: "Vite SSR: pg Pool CommonJS import"
tags: ["vite", "pg", "ssr"]
applies_to: ["node", "postgres"]
risk: "medium"
permalink: false
---

## Symptom
Named export `Pool` not found when importing `pg` in SSR.

## Patch
```bash
import pkg from 'pg';
const { Pool } = pkg;
```
