# Evening+ Epic Sudoku — User Guide

Epic Sudoku offers classic generated puzzles and a deterministic daily puzzle that changes at the player’s local midnight.

## Playing

1. Choose Classic or Daily mode.
2. Choose an estimated difficulty.
3. Select a cell and enter a number using the keypad or keyboard.
4. Use arrow keys to move between cells.
5. Toggle Notes mode to enter candidate numbers.
6. Use Undo or Redo to navigate recent changes.

## Settings

- **Conflict Guard** blocks duplicate values in the same row, column, or 3×3 box.
- **Correctness Feedback** separately highlights values that differ from the generated solution.
- **Peer highlighting** highlights the selected row, column, and box.

## Assistance and statistics

Hints, reveals, and checks are recorded. Any of these makes the completion an assisted solve. Only clean solves can set clean best times.

Daily streaks advance according to the player’s local calendar day.

## Generation

Puzzle generation and uniqueness checks run in a background Web Worker. Difficulty is currently estimated using clue count and is labeled accordingly.

## Troubleshooting

- Allow the generation message to finish before entering values.
- Reload if the worker fails to initialize after a deployment update.
- Confirm browser storage is available if progress does not save.
- Clearing application storage removes saved puzzles and statistics.
