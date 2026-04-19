---
slug: eleventy-config-not-loaded
title: "Eleventy: custom filters not loaded in CI build"
tags: ["eleventy", "nunjucks", "ci", "build"]
applies_to: ["eleventy", "netlify"]
risk: "low"
permalink: false
---

## Symptom
Build errors like `filter not found: date`.

## Patch
```patch
TARGET FILE: package.json scripts

FIND:
"build": "... && eleventy"

REPLACE WITH:
"build": "... && eleventy --config=.eleventy.cjs"
```

## Notes
Explicit config path removes ambiguity in CI environments.
