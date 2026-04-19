---
slug: netlify-pnpm-frozen-lockfile
title: "Netlify: ERR_PNPM_OUTDATED_LOCKFILE in CI"
tags: ["netlify", "pnpm", "ci", "lockfile"]
applies_to: ["node", "netlify"]
risk: "low"
permalink: false
---

## Symptom
Netlify build fails during install with `ERR_PNPM_OUTDATED_LOCKFILE`.

## Patch
```patch
TARGET FILE: pnpm-lock.yaml

FIND:
(package missing from lockfile)

REPLACE WITH:
Regenerate lockfile so it includes all package.json dependencies.

Commands:
pnpm install --lockfile-only
# or
pnpm install
```

## Notes
Commit the updated lockfile before pushing to Netlify.
