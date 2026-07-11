# Evening+ Epic Sudoku — Developer Documentation

## Architecture

- `index.html` provides the responsive, accessible application shell.
- `sudoku.js` manages UI state, persistence, keyboard controls, notes, history, assistance, and statistics.
- `sudoku-worker.js` transforms prevalidated unique templates and independently verifies uniqueness away from the interface thread.
- `manifest.json` defines a directory-scoped standalone PWA.
- `sw.js` owns only `for-me-sudoku-*` caches and precaches the worker runtime.

## Generation

The main thread sends a `GENERATE` message containing a deterministic seed and estimated difficulty. The worker:

1. Selects the prevalidated clue mask for the requested difficulty.
2. Applies seeded digit, band, row, stack, column, and transpose transformations to a valid completed grid.
3. Applies the same position transformations to the clue mask.
4. Counts solutions up to two using a bitmask-based minimum-candidate solver.
5. Rejects the result unless exactly one solution exists.
6. Returns the puzzle, solution, givens, generation time, and verification metadata.

Transformations preserve the template’s uniqueness while producing a large set of fresh boards. The final solver check protects against template or implementation regressions without repeatedly performing expensive clue-removal searches at runtime.

## Daily puzzles

Daily seeds use a local calendar-date key:

```text
daily:YYYY-MM-DD:difficulty
```

This intentionally changes at the player’s local midnight rather than UTC midnight. The same local date and difficulty produce the same transformed puzzle.

## Difficulty

Difficulty is currently a clue-count estimate:

- Easy: 40 givens
- Medium: 34 givens
- Hard: 28 givens
- Expert: 24 givens

The UI labels the rating as estimated. A future technique-based logical solver can replace this rating system without changing the worker message contract.

## Storage

- `evening_sudoku_game_v2` — versioned current game and UI state
- `evening_sudoku_stats_v2` — clean solves, assisted solves, local daily streak, completed IDs, and clean best times

Invalid saved state is discarded instead of being trusted.

## Assistance

Hints, reveals, and checks are tracked separately. Any assistance makes a completion assisted and prevents it from setting a clean best time.

## Controls

Conflict Guard and Correctness Feedback are intentionally separate:

- Conflict Guard detects immediate duplicate-rule violations.
- Correctness Feedback compares entered values with the generated solution.

## Testing

Run the release validator, Electron runtime smoke test, and Playwright suite:

```bash
npm run validate:release
npm run test:electron
npm test
```
