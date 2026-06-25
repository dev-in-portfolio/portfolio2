# Oracle Pit — A Prompt Sandbox That Separates Inputs, Rules, and Results

A portfolio build demonstrating guardrails, legible output framing, and fast refinement loops.

## Problem the app solves

A dramatic prompt/logic lab that makes iteration feel controlled instead of chaotic.

## Key experience goals

- Separate zones for prompt, constraints, and output.
- Iteration-forward controls that encourage small changes.
- Aesthetic-first UI without sacrificing readability.
- Demo stability: hard to break, easy to reset.

## Architecture snapshot

- Client-side structure with explicit validation states.
- Optional provider wiring can be abstracted into demo mode.
- Local-first iteration history (where enabled).

## Reliability and edge cases

- Blank output: UI must show why (validation) and how to fix it.
- Runaway verbosity: outputs are constrained to readable blocks.
- Accidental destructive actions: reset/clear is deliberate.

## Next build targets

- Add prompt templates and versioning.
- Add export to Markdown/JSON for portability.
- Add ‘compare runs’ diff view for iteration clarity.
