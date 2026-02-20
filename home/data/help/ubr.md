# UBR — Ultimate Broker Routing (Help)

**What this is:** UBR is a multi‑day, multi‑stop route planning tool built for brokers/field agents who juggle lots of appointments, tight time windows, and “don’t make me retype that address” fatigue.

## Quick start (2 minutes)
1. **Add stops** (manual, paste, or however you’ve wired your import).
2. **Set constraints**: start location, day breaks, max stops/day, time windows (if enabled).
3. Hit **Optimize / Build Route**.
4. Use the **Route Scoreboard** to compare options and pick the one you’ll actually follow.

## “Where to look first”
- **Route builder / optimizer UI** — the core value.
- **Multi‑day handling** — how you break days and carry over stops.
- **Stop list + validation** — duplicate handling, bad addresses, missing fields.
- **Export / share** — whatever your “hand this to future me” output is.

## Common issues
### My map is blank
- Check network (map tiles / geocoder).
- If hosted, confirm **HTTPS** and that any API keys are allowed for your domain.

### Optimization feels “wrong”
- Verify the cost function: distance vs. time vs. penalties (time windows, day caps).
- Try smaller test sets (5–10 stops) to validate logic.

### Data isn’t saving
- If you’re using localStorage, open DevTools → Application → Storage and confirm keys exist.
- If you’re using a backend, confirm CORS + auth headers.

## Keyboard / power-user
- Enter to add a stop (if enabled)
- Ctrl/Cmd+K for search (if enabled)
- Esc to close panels (if enabled)

---

_Last updated: 2026-01-08_
