---
slug: netlify-function-api-redirect
title: "Netlify: API routes not reaching serverless function"
tags: ["netlify", "redirects", "functions", "api"]
applies_to: ["node", "netlify"]
risk: "low"
permalink: false
---

## Symptom
Frontend calls `/api/*` but requests return 404.

## Patch
```patch
TARGET FILE: netlify.toml

FIND:
(no API redirect)

REPLACE WITH:
[[redirects]]
from = "/api/*"
to = "/.netlify/functions/server/api/:splat"
status = 200
force = true
```

## Notes
Function name in path must match built function filename.
