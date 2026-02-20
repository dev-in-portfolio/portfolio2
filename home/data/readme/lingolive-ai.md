# LingoLive AI — README

**A language practice product demo: correction, explanation, and drills with clear UX.**

## Overview
LingoLive AI demonstrates “applied AI product design” in a language learning context. The goal is not just to output text, but to help the user improve through structured feedback.

## What it demonstrates
- **Tone + level control** to keep outputs aligned to user intent.
- **Teach‑back explanations** rather than raw corrections.
- **Practice drill generation** for repetition and retention.
- **Keyless demo path** (where enabled) for recruiter testing.

## Project structure
Key folders:

- `apps/lingolive-ai/`
- `shared/`
- `data/`


## Run locally
Serve locally and open `/apps/lingolive-ai/`. Configure nothing for DEMO mode builds.

## Deploy
Static deploy is fine for DEMO mode. If integrating a live model later, route through a server proxy and keep keys off the client.

## Notes
Language learning is sensitive: outputs should avoid hallucinated ‘facts’ and should explain grammar carefully. Design the UI so the user can verify and iterate.

## Roadmap
- Add spaced‑repetition deck export.
- Add pronunciation hints and IPA toggle.
- Add “conversation mode” with turn history.

---
_Last updated: 2026-02-11_
