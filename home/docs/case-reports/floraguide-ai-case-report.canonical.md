# FloraGuide AI — Field-Guide Information Architecture for Plant Workflows

A portfolio build demonstrating how AI outputs are made usable through information design and safety-aware UX.

## Problem the app solves

A plant-knowledge assistant concept that turns messy lookup into structured, scannable guidance.

## Key experience goals

- Structured output (ID cues → care → cautions) instead of a single chat blob.
- Fast demo path with sample inputs and readable sections.
- Uncertainty handling: prompts for clarifying details.
- Mobile-first reading experience for ‘in the yard’ use.

## Architecture snapshot

- Client-side UI with clear sections and consistent formatting.
- Optional AI layer can be abstracted (demo mode) without breaking the UX.
- Local-first state for notes/history where applicable.

## Reliability and edge cases

- Vague inputs: UI must request missing details rather than hallucinate confidence.
- Safety: cautions are presented as guidance, not medical claims.
- Offline/blocked AI: curated examples keep the app demoable.

## Next build targets

- Add source citations per section for production readiness.
- Add region/season filters and image-based ID (optional).
- Add exportable ‘care card’ one-pager.
