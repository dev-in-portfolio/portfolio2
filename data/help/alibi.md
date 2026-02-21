# ALIBI — Logged & Verified (Help)

**What this is:** ALIBI is a kitchen inventory app focused on **tracking + verification** — what you have, what moved, and who/when it was confirmed. It’s built to reduce “I swear we had 2 cases of that” moments.

## Quick start (2 minutes)
1. **Create an item** (name, category, unit).
3. Use **Log & Verify** when something changes (received / used / moved / counted).
4. Check the **history** to see what happened and why.

## “Where to look first”
- **Audit trail / event log** — the signature feature.
- **Verification UX** — fast, low-friction confirmation steps.
- **Search + filters** — find items quickly under pressure.
- **Offline safety** (if enabled) — what happens when the kitchen Wi‑Fi lies.

## Common issues
### My data disappeared
- If you’re using localStorage/IndexedDB: clear‑storage events can wipe it.
- If you’re using a backend: confirm you’re pointing to the correct environment.

### Quantities don’t match reality
- Make sure every change creates a log entry (no “silent” edits).
- Add a “stock count” event type to reconcile drift.

### It’s slow on mobile
- Large tables: paginate or virtualize.
- Defer heavy rendering until after first paint.

---

_Last updated: 2026-01-08_
