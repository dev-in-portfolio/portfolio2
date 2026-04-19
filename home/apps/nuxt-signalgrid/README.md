# Nuxt SignalGrid

Nuxt 3 control board for signals with server-side threshold evaluation.

## Features
- Status tiles with polling
- Signal detail view + thresholds
- Bulk create workflow
- Neon-backed persistence

## Setup
1. Install dependencies
   - `pnpm install`
2. Create `.env` from `.env.example`
3. Apply SQL in `sql/003_signalgrid.sql`
4. Run locally
   - `pnpm run dev`
