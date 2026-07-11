# Crossword Arena — Developer Documentation

## Architecture

- `index.html` provides the responsive and accessible application shell.
- `app.js` provides grid rendering, input handling, persistence, weekly progression, Meta unlocking, and clean/assisted statistics.
- `data/puzzles.json` contains the original licensed-in-repository puzzle pack.
- `manifest.json` defines a directory-scoped standalone PWA.
- `sw.js` owns only `for-me-crossword-*` caches.

## Puzzle contract

The data file must contain:

- Exactly five `weekly` puzzles
- A `library` array
- One `meta` puzzle
- Unique IDs
- Square uppercase grids
- Clues for every Across and Down entry
- Explicit license metadata

Run `npm run validate:release` from the repository root to validate the contract.

## Storage

- `cw_arena_progress_v4` — per-puzzle grid state and assistance usage
- `cw_arena_stats_v4` — clean and assisted solve statistics
- `cw_arena_weekly_v4` — weekly puzzle completion IDs

Malformed or older incompatible data falls back to a clean versioned state.

## Input

Desktop letters are handled through global keyboard events when focus is not inside another form control. Mobile text is handled through the dedicated `crosswordInput` element so one input event maps to one letter.

Direction changes are target-aware. Double-tapping the same cell changes direction without globally suppressing rapid taps on different cells.

## Content policy

Do not restore the removed newspaper puzzle archive without documented redistribution rights. See the root `CONTENT-LICENSE.md`.
