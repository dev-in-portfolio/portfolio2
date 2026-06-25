# Splice — Help

**A small, surgical utilities app in the Nexus portfolio focused on clean inputs → clean outputs.**

## What this is
Splice is designed to show “operator‑trained” thinking: take messy real‑world input, normalize it, and produce a dependable output without drama. In portfolio terms, it’s a compact demonstration of practical UX, validation, and predictable state handling—meant to feel fast and unbreakable.

## How to use it
Use the primary input area to paste or type your text/data and then use the on‑screen actions to transform it. Each action is intentionally narrow (one job, done well). The output panel updates immediately so you can iterate quickly.

On mobile/tablet: you can scroll the panels independently; if the keyboard covers buttons, collapse the keyboard and use the action row first, then return to editing.

## Tips
If you’re testing as a recruiter: treat this like a micro‑product—look for clear affordances, sane defaults, and guardrails. Try intentionally “bad” input (empty strings, huge blocks, weird symbols) and notice it fails gracefully.

If you’re testing as Devin: this is a good place to plug in future micro‑tools without bloating the main Utilities hub—keep every feature small, named, and reversible.

## Troubleshooting
- **Nothing happens when I click an action**: refresh the page; if you’re on an older tab, the build may have changed. Also confirm you’re not selecting text inside an overlay modal.
- **Output looks wrong**: check for hidden whitespace (line breaks, tabs). Splice preserves more than you think on purpose.
- **Mobile scrolling feels ‘stuck’**: pinch‑zoom back to 100% and try dragging on the empty background area, not on a button.

## Privacy + data
Splice runs fully in the browser. Unless a specific feature says otherwise, your pasted content stays on your device and is not sent to a server.

---
_Last updated: 2026-02-11_
