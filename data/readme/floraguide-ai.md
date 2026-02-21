# FloraGuide AI — README

**An applied‑AI UX demo for plant identification + care guidance, designed to work without keys.**

## Overview
FloraGuide AI is built around a single idea: AI features should behave like tools, not magic. This app demonstrates how to collect structured inputs, produce structured outputs, and communicate uncertainty clearly.

## What it demonstrates
- **Structured prompting/UI**: inputs map to outputs predictably.
- **Keyless operation**: supports deterministic DEMO mode for recruiter testing.
- **Uncertainty surfaced**: confidence + “what to verify next.”
- **Product thinking**: guardrails, clarity, and consistent formatting.

## Project structure
Key folders:

- `apps/floraguide-ai/` — UI and logic
- `shared/` — shared styling/navigation
- `data/` — help/readme content


## Run locally
Serve locally and open `/apps/floraguide-ai/`. If the app supports DEMO mode, it will run without any configuration.

## Deploy
Deploy as static. If you add a server proxy later, keep keys off the client and provide a safe fallback path for demos.

## Notes
Recruiter‑safe AI demos matter. A keyless deterministic path keeps the UX testable while still showing the product design.

## Roadmap
- Add a “compare candidates” view.
- Add region‑aware suggestions.
- Add explicit provider toggle with disclosure + rate limiting.

---
_Last updated: 2026-02-11_
