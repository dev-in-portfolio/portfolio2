# Crossword Arena — Help

**A playful crossword experience built to show UI polish, state management, and game‑logic discipline.**

## What this is
Crossword Arena is a portfolio demo that blends game UX (grid interactions, checking answers, progress cues) with robust app behaviors (saving state, responsive layout, and clear error prevention). It’s meant to feel fun, but the subtext is engineering: state, constraints, and trust.

## How to use it
Start a puzzle from the main screen. Tap a cell to focus it, then type letters. Use the clue list to jump around.

On touch devices:
- Tap once to focus a cell
- Tap again (or tap a clue) to change direction
- Use the on‑screen controls to clear a cell/word if provided

If the app offers “check” or “reveal” actions, use them sparingly—those are there to show controlled state transitions, not to trivialize the puzzle.

## Tips
If you’re evaluating this as a recruiter: pay attention to interaction details—focus rings, how direction changes, whether invalid actions are blocked, and whether the UI communicates what will happen before it happens.

If you’re on mobile and the keyboard covers the clue area: scroll the clue panel, not the full page, and use landscape if needed.

## Troubleshooting
- **Typing doesn’t enter letters**: make sure a cell is selected (highlighted). Some mobile browsers require a second tap to bring up the keyboard.
- **Grid looks too small/too large**: pinch‑zoom back to normal; the app is tuned for 100% zoom.
- **I lost progress**: if your browser blocks storage, progress won’t persist between refreshes.

## Privacy + data
If Crossword Arena saves progress, it uses browser storage on your device. It does not require accounts or logins.

---
_Last updated: 2026-02-11_
