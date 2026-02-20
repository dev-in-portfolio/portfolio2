# Prompt Vault — README

**A prompt library product demo: search, tag, reuse, and export.**

## Overview
Prompt Vault is designed to show practical IA: how you organize lots of small text assets so they stay usable. It’s a portfolio piece aimed at product engineering roles—UX plus data hygiene.

## What it demonstrates
- **Search + filtering** for fast retrieval.
- **Consistent formatting** for copy/paste workflows.
- **Extensible data model** (prompts as objects, not blobs).
- **Portfolio‑safe**: works without accounts/keys.

## Project structure
Key folders:

- `apps/prompt-vault/` (or the app folder wired from the Nexus Apps list)
- `data/` — seed prompts (if embedded)
- `shared/`


## Run locally
Serve locally and open the app via the Nexus UI. If you add data files later, prefer static JSON shipped with the site.

## Deploy
Static deploy. If you add sync later, keep it optional and never block reading/copying on login.

## Notes
The killer feature for a prompt tool is portability: export and import. Even if you don’t implement it yet, design the data structure so it’s easy.

## Roadmap
- Add export/import (JSON + Markdown).
- Add prompt templates with variables.
- Add “collections” for workflows (job apply, debugging, research).

---
_Last updated: 2026-02-11_
