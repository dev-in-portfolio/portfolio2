---
slug: neon-netlify-env-fallback
title: "Neon + Netlify: DB URL fallback pattern"
tags: ["postgres", "neon", "netlify", "env"]
applies_to: ["node", "netlify", "postgres"]
risk: "low"
permalink: false
---

## Symptom
App works locally but DB is unavailable on Netlify.

## Patch
```patch
TARGET FILE: server db init file

FIND:
const url = process.env.DATABASE_URL;

REPLACE WITH:
const url = process.env.DATABASE_URL
  || process.env.NETLIFY_DATABASE_URL
  || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
```

## Notes
Set all three env vars in Netlify for compatibility across branches.
