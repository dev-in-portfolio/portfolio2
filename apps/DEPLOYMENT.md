# Apps Deployment

The Netlify project `dev-in-portfolio-apps` deploys from the `apps` branch.

This branch is synchronized from the current Portfolio 2 `main` branch before release. The root Netlify build runs `npm run build:netlify`; `scripts/build-netlify-site.mjs` detects the Apps project and runs the dedicated `npm run build:apps-deployment` pipeline.

Coverage Compass static deployment uses `scripts/prepare-static-app-compat.mjs` before assembly so its required report modules are copied to the allowed `src/report-modules/` path.
