---
slug: astro-api-functions-routing
title: "Astro static site with Netlify functions API routing"
tags: ["astro", "netlify", "functions", "api"]
applies_to: ["astro", "netlify"]
risk: "low"
permalink: false
---

## Symptom
Static Astro UI loads, but API-backed features fail.

## Patch
```patch
TARGET FILE: netlify.toml

FIND:
(no functions dir / no api redirect)

REPLACE WITH:
[functions]
directory = "netlify/functions"

[[redirects]]
from = "/api/*"
to = "/.netlify/functions/:splat"
status = 200
force = true
```

## Notes
Use function names matching files in `netlify/functions`.
