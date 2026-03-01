# ClipForge

ClipForge is a Tauri desktop app. This Netlify deploy is a landing page with direct download links for desktop binaries.

## Update Download URLs
Edit `src/App.svelte` and update the `downloads` URLs to your release assets:
- macOS `.dmg`
- Windows `.exe`
- Linux `.AppImage`

Recommended source: GitHub Releases direct asset URLs (`/releases/latest/download/...`).

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`

## Local dev
- Install deps: `pnpm install`
- Web landing page: `pnpm dev`
- Desktop app: `pnpm tauri dev`
