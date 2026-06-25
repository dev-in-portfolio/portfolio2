# Oracle Pit — README

**A structured reasoning workflow app: constraints → options → risks → next steps.**

## Overview
Oracle Pit is designed like a product worksheet for decision making. It showcases how to turn ambiguous questions into structured outputs that can be reviewed and acted on.

## What it demonstrates
- **Constraint capture** and conflict detection.
- **Alternatives + failure modes** (not just one answer).
- **Traceable reasoning**: assumptions are explicit.
- **Portfolio consistency**: Nexus shell + shared tokens.

## Project structure
Key folders:

- `apps/oracle-pit/` (or equivalent app folder)
- `shared/`
- `data/`

If the app folder name differs, the documentation links still live under `/help/oracle-pit/` and `/readme/oracle-pit/`.

## Run locally
Serve locally and navigate to the Oracle Pit app route from the Nexus UI. If it’s not wired yet, confirm the app folder exists under `apps/` and matches the link target.

## Deploy
Static deploy works for demo logic. For live model support, use a server‑side proxy and keep keys off the client.

## Notes
This app should feel like a calm, structured ‘pit stop’ for thinking—no theatrics, just clean analysis.

## Roadmap
- Add decision log export (PDF/Markdown).
- Add “compare options” table view.
- Add saved scenarios (local storage + export).

---
_Last updated: 2026-02-11_
