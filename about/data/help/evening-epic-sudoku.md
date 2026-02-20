# Evening Epic Sudoku — Help

**A calm, high‑polish Sudoku experience—built to show interaction design and logic correctness.**

## What this is
Evening Epic Sudoku is a portfolio demo with a “wind‑down” vibe: clean visuals, low friction, and dependable puzzle behavior. Under the hood it’s a logic‑heavy UI problem: validation, notes, conflicts, and state that never lies.

## How to use it
Pick a difficulty (if offered) and tap a cell to start. Enter numbers using the keypad. Use notes/pencil mode for candidates.

If conflict highlighting exists, it should guide—not shame—so you always know why a move is invalid or risky.

On mobile: if the keypad covers the board, scroll the board area or switch to landscape; the app is designed to keep the active cell visible.

## Tips
Try these sanity checks:
- Enter a number that conflicts and confirm the UI explains the conflict.
- Use notes mode and confirm notes clear correctly when you commit a number.
- Refresh and see whether progress persists (if storage is enabled).

This app is meant to feel quiet and confident—if it feels twitchy, that’s a signal for refinement.

## Troubleshooting
- **Keypad doesn’t respond**: make sure a cell is selected.
- **Notes won’t toggle**: some mobile browsers miss the first tap if you’re scrolling; tap once to stop scroll, then tap again.
- **Progress resets**: browser storage may be blocked or cleared.

## Privacy + data
Any saved progress lives in your browser storage. No account is required.

---
_Last updated: 2026-02-11_
