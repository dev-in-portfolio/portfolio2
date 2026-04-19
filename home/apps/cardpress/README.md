# Nuxt CardPress

Nuxt 3 editor for composing card-based pages and publishing public URLs.

## Features
- Draft dashboard + editor
- Ordered card list with preview
- Publish to `/p/:publishedSlug`
- Neon-backed persistence

## Setup
1. Install dependencies
   - `pnpm install`
2. Create `.env` from `.env.example`
3. Apply SQL in `sql/002_cardpress.sql`
4. Run locally
   - `pnpm run dev`
