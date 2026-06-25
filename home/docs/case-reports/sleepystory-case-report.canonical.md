# SleepyStory — Calm Story Generation With Guardrails

A portfolio build demonstrating tone control surfaces and a soothing reading experience.

## Problem the app solves

A bedtime story generator concept that prioritizes comfort, pacing, and safe iteration.

## Key experience goals

- Calm UI: low noise, large readable text.
- Short-form cadence for bedtime use.
- Tone/length controls for predictable outputs.
- Demo-safe fallbacks when generation is unavailable.

## Architecture snapshot

- Client-side layout optimized for reading.
- Optional generation layer abstracted behind demo mode.
- Local-first favorites/history where applicable.

## Reliability and edge cases

- Overlong stories: enforce length controls.
- Inappropriate content risk: guardrails and safe defaults.
- Mobile ergonomics: no tiny controls, no accidental taps.

## Next build targets

- Add read-aloud mode (optional).
- Add parent controls and saved profiles.
- Add share/export as printable story card.
