# Splice — README

**A focused utilities micro‑app: normalize, transform, and validate inputs with fast feedback.**

## Overview
Splice exists to prove a simple point: reliability isn’t complicated, it’s disciplined. It prioritizes clear UI states, defensive parsing, and “no surprises” behavior over novelty.

## What it demonstrates
- **Guardrails first**: input validation, empty‑state handling, and predictable fallbacks.
- **Fast feedback loop**: actions produce immediate, visible changes.
- **Operator UX**: readable hierarchy, obvious buttons, low cognitive load.
- **Portable architecture**: easy to extend without leaking features into other apps.

## Project structure
This portfolio uses a consistent shell. Splice lives under:

- `apps/splice/` — app UI
- `shared/` — shared Nexus styling + top navigation
- `data/` — content used by Help/Readme pages


## Run locally
This repo is static‑site friendly. Open `apps/splice/index.html` via a simple local server (recommended) so relative paths behave the same as on Netlify.

Examples:
- Python: `python -m http.server`
- Node: `npx serve`

## Deploy
Deploy as part of the full portfolio site (recommended) so the Nexus bar and shared assets resolve correctly. On Netlify: the build can be a straight publish of the repository (no build step) if you’re shipping plain HTML/CSS/JS.

## Notes
If you add new “splice” actions later: keep them small, reversible, and testable. If an action can’t be explained in one sentence, it doesn’t belong here.

## Roadmap
- Add optional “preview diff” mode for transforms.
- Add a tiny audit log (“what actions did I apply?”) without storing sensitive data.
- Add keyboard shortcuts for power users.

---
_Last updated: 2026-02-11_
