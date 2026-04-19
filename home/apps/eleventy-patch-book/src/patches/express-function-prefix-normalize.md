---
slug: express-function-prefix-normalize
title: "Express in Netlify function: normalize function URL prefix"
tags: ["express", "netlify", "functions", "routing"]
applies_to: ["node", "netlify", "express"]
risk: "medium"
permalink: false
---

## Symptom
Routes work locally but not behind Netlify function path.

## Patch
```patch
TARGET FILE: server entry

FIND:
(no prefix normalization middleware)

REPLACE WITH:
app.use((req, _res, next) => {
  const fnPrefix = '/.netlify/functions/server';
  if (req.url === fnPrefix) req.url = '/';
  else if (req.url.startsWith(`${fnPrefix}/`)) req.url = req.url.slice(fnPrefix.length);
  next();
});
```

## Notes
Keeps local and serverless route handling consistent.
