# Remix VaultKey

Sealed notes app with client-side encryption and server-side storage of ciphertext only.

## Features
- PBKDF2 + AES-GCM encryption in the browser
- Server stores only salt/iv/ciphertext
- Unlock per-session to decrypt

## Setup
1. Install dependencies
   - `pnpm install`
2. Create `.env` from `.env.example`
3. Apply SQL in `sql/002_vaultkey.sql`
4. Run locally
   - `pnpm run dev`
