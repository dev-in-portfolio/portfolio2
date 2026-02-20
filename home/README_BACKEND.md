# Backend CLI Pack (Netlify Functions + Neon)

This folder is meant to be dropped into the **root of your Netlify site folder** (the same folder you deploy).
It adds Netlify Functions under `netlify/functions/` and a `netlify.toml` that:
- Publishes the current directory (`publish = "."`)
- Uses `netlify/functions` for serverless functions
- Redirects `/api/*` to the matching function

## Endpoints (HTTP)
- GET  /api/health
- POST /api/ai-gemini-proxy
- POST /api/lingolive-save
- GET  /api/lingolive-list?client_id=...
- POST /api/oracle-save
- GET  /api/oracle-list?client_id=...
- POST /api/sleepystory-save
- GET  /api/sleepystory-list?client_id=...
- POST /api/toon-project-save
- GET  /api/toon-project-list?client_id=...

## BYO-KEY (Gemini)
Send `x-gemini-key: <user key>` header to /api/ai-gemini-proxy.

## Retention
On every write, the function deletes rows older than 7 days for that app tables.

## DB Connection
Uses Netlify-provided env var: NETLIFY_DATABASE_URL (pooled).

## Migrations
See `notes/neon_schema.sql`.
