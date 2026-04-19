# PatchBook

Eleventy patch library with validation, search, and copy-safe blocks.

## Run locally

1. `npm install`
2. `npm run build`
3. `npm run dev`

## Features

- YAML front matter parsing with robust validation
- Rich patch metadata: risk, environment, version, confidence, verification
- Multi-filter search by risk, environment, tag, and version
- Better result ranking (high-risk patches first)
- Keyboard navigation (press / to focus search)
- Patch anatomy with rollback notes and applicability
- Related patches linking
- Copy buttons on code blocks with confirmation
- Warning UX for high-risk patches

## Patches

Patches live in `src/patches/` as Markdown files with YAML front matter. The search index outputs to `/_patch_index.json`.

## Validation

Run `npm run validate` to check patches. Validation includes:
- Required fields (slug, title, tags, risk)
- Valid risk levels (low, medium, high)
- Valid environments (production, staging, development, all)
- Array validation for tags and applies_to
- Version range format
- Confidence percentage range
- Presence of patch/bash/sh code blocks
