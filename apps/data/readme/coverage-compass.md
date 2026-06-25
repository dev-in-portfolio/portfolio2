# Coverage Compass — Complete Build

## What this is

## Why this exists
Most Medicare tools optimize for marketing, not understanding. Coverage Compass exists to make tradeoffs explicit (predictability vs. variability, network constraints, underwriting asymmetry) and to explain *why* a recommendation happens—not just output a score.

## What this proves
- Decision modeling with explainable logic
- Translating policy/regulatory complexity into clear UX
- Human-centered design for high-stakes choices
- Risk framing (best/median/worst case thinking)
- Mobile-first information architecture

- **Medigap (Supplement + Part D)**
- **Medicare Advantage PPO**
- **Medicare Advantage HMO**

It is **not** enrollment, not sales, and does not recommend carriers or plan IDs.

## New: Glossary (in-app)

Open **Glossary** from the top-right button or from **Legal → Glossary**. It includes a searchable set of Medicare/Medigap/MA/Medicaid terms with aliases, related terms, and common confusions.

## Run locally

Option A (quick):
- Unzip
- Open `index.html` in a modern browser

Option B (recommended): serve a local server so the PWA/offline cache behaves like it will on a host:
- Python: `python -m http.server 8000`
- Open: `http://localhost:8000`

## Privacy model (by default)

- **Local-only**: Answers are stored in your browser’s local storage so you can resume.
- No network calls are made by the app.
- **Export / Share** is user-initiated.

## Exporting

The Export modal includes:
- **Safe** export/share: redacts typically sensitive sections (health, Rx, income/assets, eligibility)
- **Full** export/share: includes all answers

Share links place the encoded payload in the **URL fragment** (after `#`). Treat it as sensitive.

## PWA / Offline

This build includes:
- `manifest.webmanifest`
- `service-worker.js`
- `icon-192.png`, `icon-512.png`

When hosted (or served locally), the app can be installed to the home screen and used offline.

## Files

- `index.html` – UI (screens + modals)
- `styles.css` – styling
- `app.js` – UI wiring + safe export/share + service-worker registration
- `engine.js` – scoring brain + trace + audit log
- `manifest.webmanifest` / `service-worker.js` / icons – PWA
- `404.html` – SPA-friendly redirect

## Important

## Included: Full Legal Pack (v1.1, NO Blue Button)

This build embeds the full legal pack content directly into the in-app **Legal** screen (Tabs: Disclaimer, Cookies, Methodology, Security, Third‑Party, State Templates, Changelog, plus Terms/Privacy/Accessibility).

For easy editing, the original markdown files are also included at:

- `./legal_pack_md/`

After you fill placeholders in `00_FILL_ME_FIRST.md` and the other templates, you can either:
- edit the markdown copies (recommended), then re-embed into `index.html` (simple rebuild step), or
- directly edit the embedded text inside `index.html`.

Service worker cache version bumped to `cc-cache-v1.0.3`.
