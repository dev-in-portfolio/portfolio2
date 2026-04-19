---
slug: sveltekit-adapter-auto-netlify
title: "SvelteKit: adapter-auto not selecting Netlify reliably"
tags: ["sveltekit", "netlify", "adapter", "build"]
applies_to: ["sveltekit", "netlify"]
risk: "medium"
permalink: false
---

## Symptom
Build warns `Could not detect a supported production environment`.

## Patch
```patch
TARGET FILE: svelte.config.js

FIND:
import adapter from '@sveltejs/adapter-auto';

REPLACE WITH:
import adapter from '@sveltejs/adapter-netlify';

kit: {
  adapter: adapter()
}
```

## Notes
Pin an adapter version compatible with your installed `@sveltejs/kit`.
