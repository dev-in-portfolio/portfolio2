# SpecForge

Eleventy spec compiler for YAML-driven documentation with validation, filtering, and reporting.

## Run locally

1. `npm install`
2. `npm run build`
3. `npm run dev`

## Features

- YAML spec ingestion with automatic normalization
- Strict validation with enum checks and duplicate detection
- Rich spec pages with sidebar navigation and linked sections
- Multi-filter search by status, owner, and tag
- Keyboard navigation (press / to focus search)
- Surfaced validation report UI
- Related specs linking
- Pretty request/response rendering
- Export support (JSON, printable, machine-readable)

## Specs

Specs live in `src/specs/` as YAML files. The search index outputs to `/_spec_index.json`.

## Validation

Run `npm run validate` to check specs. The report is available at `/report.html`.
