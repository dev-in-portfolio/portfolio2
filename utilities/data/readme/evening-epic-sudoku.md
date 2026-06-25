# Evening Epic Sudoku — README

**A Sudoku UI + logic demo with a calm aesthetic and strict correctness.**

## Overview
Evening Epic Sudoku demonstrates a common product challenge: correctness plus comfort. The UI should feel soothing while the rules engine stays uncompromising.

## What it demonstrates
- **Constraint‑based validation** (rows/columns/boxes).
- **Notes/pencil mode** that behaves predictably.
- **UX polish**: clear focus, readable contrast, minimal friction.
- **Mobile friendly**: usable with touch + on‑screen keyboards.

## Project structure
Key folders:

- `apps/evening-epic-sudoku/`
- `shared/`
- `data/help/` and `data/readme/`


## Run locally
Use a local server and open `/apps/evening-epic-sudoku/`. Direct file opens can break fetch/storage behavior in some browsers.

## Deploy
Deployed as part of the Nexus portfolio site; no special backend required. If you later add puzzle generation, keep generation deterministic and cacheable.

## Notes
Sudoku apps die on small trust breaks. If the UI ever highlights the wrong conflict, or notes behave inconsistently, users bounce immediately. That’s why the code should treat state as the source of truth, not the DOM.

## Roadmap
- Add “hint” that explains the rule used.
- Add accessibility improvements for keyboard navigation.
- Add a “daily puzzle” mode (static JSON).

---
_Last updated: 2026-02-11_
