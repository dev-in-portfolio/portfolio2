---
slug: netlify-vite-missing
title: "Netlify: vite not found (exit 127)"
tags: ["netlify", "build", "vite", "deps"]
applies_to: ["node", "netlify"]
risk: "low"
permalink: false
---

## Symptom
Build fails with `sh: 1: vite: not found`.

## Patch
```patch
TARGET FILE: package.json

FIND:
"build": "vite build"

REPLACE WITH:
"build": "vite build"

Notes

Ensure vite exists in dependencies, not only devDependencies.
```
