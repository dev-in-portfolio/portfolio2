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

## Automated desktop releases (GitHub Actions)
This branch includes `.github/workflows/clipforge-release.yml`.

How to publish binaries:
1. Push your code to `clip-forge`.
2. Create and push a version tag:
   - `git tag v0.1.0`
   - `git push origin v0.1.0`
3. GitHub Actions builds macOS/Windows/Linux bundles and uploads:
   - `ClipForge-macOS.dmg`
   - `ClipForge-Windows-x64-setup.exe`
   - `ClipForge-Linux-x86_64.AppImage`

Your landing page buttons use `releases/latest/download/...`, so they always point to the newest published release.
