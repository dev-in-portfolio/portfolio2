---
slug: netlify-next-plugin-missing
title: "Next.js on Netlify: plugin not configured"
tags: ["nextjs", "netlify", "build", "plugin"]
applies_to: ["nextjs", "netlify"]
risk: "medium"
permalink: false
---

## Symptom
Next app builds locally but Netlify runtime/SSR fails.

## Patch
```patch
TARGET FILE: netlify.toml

FIND:
(no next plugin)

REPLACE WITH:
[[plugins]]
package = "@netlify/plugin-nextjs"
```

## Notes
Use current Netlify Next runtime plugin when deploying Next on Netlify.
