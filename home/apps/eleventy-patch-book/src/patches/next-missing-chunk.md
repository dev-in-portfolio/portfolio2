---
slug: next-missing-chunk
title: "Next.js: missing server chunk"
tags: ["nextjs", "build"]
applies_to: ["node", "nextjs"]
risk: "high"
permalink: false
---

## Symptom
Server crashes with missing chunk file in `.next`.

## Patch
```patch
ACTION: delete .next and rebuild

rm -rf .next
npm run build
```
