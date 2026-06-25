# Coverage Compass — Help

## Where to look first
- **Start**: open the app at `/apps/coverage-compass/`
- **Decision engine**: `engine.js` (scoring + uncertainty)
- **UI + wiring**: `app.js`
- **Glossary**: `glossary.js`
- **Legal pack**: `legal_pack_md/` (markdown source)

## Common actions
- Use **Theme** toggles (light / high contrast) to test accessibility quickly.
- Use the **Data Control Panel / Dev Panel** to validate inputs & outputs.
- If the scoring looks wrong: open DevTools → Console and look for `engine` warnings.

## Offline / local-only
This app is designed to run without sending your inputs anywhere (local-only). If you deploy behind a different base path, make sure the Service Worker scope is correct.

_Last updated: 2026-01-11_
