# TODO LATER NOTES

- [ ] Feature: Add member-specific views
- [ ] Feature: Member authentication integration
- [ ] Task: Audit member access levels
- [ ] Note: NCX capable walkthrough, all ways to view, comprehensive guide
- [ ] Note: find the one with the right timestamp copy paste.

## Continuation Notes — Capabilities Page

- [x] Continuation: tighten the demo tour copy so it reads sharper and more persuasive now that the mechanics are stable
- [x] Continuation: tune tour pacing and spotlight/card positioning, especially around the drawer and toolbar steps
- [x] Continuation: clarify the scoreboard reading order so lens pill, bars, and proof scope read as one system
- [x] Continuation: make the difference between accordion category navigation and role-card scanning more explicit
- [x] Continuation: improve briefing drawer hierarchy and skimmability so dense sections read faster
- [x] Continuation: verify Recruiter Mode is actually faster to scan and simplify it further if needed
- [x] Continuation: remove the neon green treatment and shift the page toward a less aggressive highlight/accent system
- [x] Continuation: clean up the local asset-path 404s for shared styles/scripts and favicon on the static localhost build

## Continuation Notes — Capabilities Compact Pass

- Current local URL on static server: `http://127.0.0.1:8080/capabilities/`
- URL state now restores `lens`, `category`, `q`, `compact`, `score`, and `role`
- Verified deep link example: `http://127.0.0.1:8080/capabilities/?lens=eval&category=product&compact=1&role=ai-product-manager`
- Drawer now has `Copy briefing link`; role opening uses the active scoreboard lens instead of always falling back to the role default
- Best next compact-oriented pass: tighten Recruiter Mode further without losing proof trust signal
- Recommended next tasks:
- [x] Continuation: preserve one short proof-context line per card in compact mode so scan speed stays high without turning the view into unsupported claims
- [ ] Continuation: add keyboard navigation for category headers, role-card stepping, and drawer open/close flow
- [x] Continuation: verify `q=` and `score=off` URL-state reload behavior explicitly and keep state handling symmetric
- [ ] Continuation: consider a small sticky current-view summary rail on desktop showing lens, category, result count, and active role
- Latest explicit verification: `http://127.0.0.1:8080/capabilities/?lens=ux&category=ux&q=trust&compact=1&score=off` reloads with search preserved, `ux` category open, compact mode on, scoreboard hidden, and compact proof line visible on role cards
