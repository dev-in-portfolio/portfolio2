# Splice — The Convergence of Mobile NLE UX and WebAssembly Architectures

A cross-domain case study: the commercial Splice app’s mobile NLE patterns, and what it takes to recreate “splicing” workflows inside a modern browser.

## Why this exists

This report exists to connect two realities that share the same word: Splice as a mainstream mobile editor, and splice as an engineering primitive used to build timeline-style interfaces. The goal is not trivia — it is to show how product decisions (touch UX, aspect ratios, low-friction workflows) map to technical constraints (memory, encoding, cross-origin isolation) when similar experiences are attempted on the web.

## Product patterns worth stealing

- Timeline interactions that feel tactile on touch devices (selection, trim handles, magnified previews).
- Aspect-ratio agnostic canvases (9:16, 1:1, 16:9) with Fit/Fill posture instead of forcing the user to re-shoot.
- Audio-first affordances: waveforms, beat markers, and ducking as default behavior instead of “pro-only” tools.

## The engineering translation to the browser

Browser-based editors often model a timeline as an ordered list of clip segments. The simplest implementation uses a JavaScript array, so inserts/deletes/reorders map to splice(). That’s readable, but heavy edits can cause jank if each change forces large rerenders. Stronger builds reduce rerenders (virtualization, memoization) or use structures optimized for insert/delete at the cursor.

## WASM + FFmpeg feasibility envelope

FFmpeg compiled to WebAssembly enables surprisingly powerful client-side media operations, but it comes with constraints: a virtual in-memory filesystem (MEMFS), large binary payloads, and heavy CPU work that must be pushed into Web Workers to keep the UI responsive. High-performance paths often depend on SharedArrayBuffer, which requires cross-origin isolation via COOP/COEP headers.

## Deployment gotchas (Netlify-class hosts)

- Cross-origin isolation headers (COOP/COEP) must be served correctly for SharedArrayBuffer-backed performance paths.
- Asset hosting must respect CORS/CORP rules or worker/WASM fetches can fail silently.
- Memory pressure is real: long sessions and large files can crash tabs if allocations never return to the OS.

## What this demonstrates in the portfolio

- Systems thinking: connecting UX patterns to implementation cost and platform limits.
- Reliability mindset: designing flows that do not dead-end when advanced capabilities are missing.
- Product clarity: translating complex operations into understandable, safe UI states.
