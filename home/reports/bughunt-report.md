# Exhaustive Bug Hunt & Fix Report

## What was runtime-verified

- **Patched only (not runtime-verified in this environment)**: I validated static integrity + JavaScript syntax, but I cannot execute a real browser console/network run for every route here.

## Static Integrity Checks Performed

- Enumerated **all HTML entry points** (306) and validated all `<script src>`, `<link href>`, `<img src>`, `<source src>`, `<video poster>` references resolve to real files.

- Confirmed **no TS/TSX files remain under `/apps/`** (Netlify drag-and-drop compliant).

- Ran `node --check` syntax validation across **all .js files** (no syntax errors).

- Verified **no missing JS module imports** (no bare imports; no missing relative imports).


## Changes Made (Pass that required restart)

### 1) Remove non-deployable source app from `/apps/`

- **Problem**: `/apps/splice/react_source_original/` contained TS/TSX + Vite config and an HTML file referencing `/index.tsx` and `/index.css` (would be a FAIL under your “no build step” rule, and was a broken route).

- **Fix**: Moved it to `/private/source_backups/splice_react_source_original/` and replaced its `index.html` with a static informational page that does not load TS/TSX.

- **Why**: Keeps `/apps/` strictly runnable as-shipped static output.


### 2) Build metadata bump

- Updated `` (incremented) and `` (`build: `, updated timestamp, appended note).


## Manual Runtime Verification Checklist (Required)

Because I cannot run a full browser automation pass here, use this checklist to confirm PASS:

1. Open site root `/` and `/apps/`.

2. For each app listed in `reports/coverage-inventory.csv`, open each Entry Point and verify:

   - Page renders non-blank UI

   - No fatal console errors

   - No critical network 404s for JS/CSS

   - Primary UI actions respond

3. Spot-check critical path priority:

   - Nexus nav present once

   - Constellation map labels don’t duplicate / drift

   - Utilities counts formatting correct
