# LingoLive AI — Micro-Loop Practice UX for Language Learning

A portfolio build focusing on interaction design: prompts, feedback formatting, and iteration speed.

## Problem the app solves

A language practice companion designed around short, repeatable interactions and structured feedback.

## Key experience goals

- Micro-sessions: fast practice rounds instead of long lessons.
- Feedback structure: ‘what you said’ vs ‘improvement suggestions’.
- Mode switching without cognitive load.
- Demo-safe fallbacks when audio isn’t available.

## Architecture snapshot

- Client-side app shell with modular prompt templates.
- Local-first history and retries to encourage repetition.
- Optional voice mode; text mode remains first-class.

## Reliability and edge cases

- Mic permissions denied: must degrade gracefully.
- Unclear user intent: prompts nudge toward specificity.
- Overly long outputs: guardrails keep responses scannable.

## Next build targets

- Add spaced repetition scheduling (local-first).
- Add pronunciation scoring (optional) behind a flag.
- Add exportable session summary for coaching.
