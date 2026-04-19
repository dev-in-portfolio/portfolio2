---
slug: netlify-missing-ejs-module
title: "Netlify Functions: Cannot find module 'ejs'"
tags: ["netlify", "functions", "ejs", "bundling"]
applies_to: ["node", "netlify"]
risk: "medium"
permalink: false
---

## Symptom
Runtime fails with `Cannot find module 'ejs'` inside function bundle.

## Patch
```patch
TARGET FILE: netlify.toml

FIND:
[functions]
node_bundler = "esbuild"

REPLACE WITH:
[functions]
node_bundler = "esbuild"
external_node_modules = ["ejs"]
included_files = ["src/views/**", "node_modules/ejs/**"]
```

## Notes
Only include what the server renderer needs to keep bundle small.
