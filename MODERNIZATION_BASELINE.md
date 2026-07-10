# NEXUS Reforged — Modernization Baseline

Date established: 2026-07-10

## Protected starting point

- Repository: `dev-in-portfolio/portfolio2`
- Default branch: `main`
- Baseline commit: `136ef3c39e85a67a00b8a65d49370e6ad11c888e`
- Baseline commit message: `style: upgrade constellation homepage with telemetry corners, status indicators, and screen-space click shockwave animations`
- Protected restore branch: `archive/portfolio2-pre-reforge-2026-07-10`
- Foundation working branch: `reforge/baseline`
- Repository visibility at baseline: public
- Repository size reported by GitHub at baseline: 304040 KB

## Scope boundary

This foundation pass may modernize repository organization, application verification, build behavior, deployment behavior, testing, security boundaries, documentation, and The Vault.

It must stop before intentional work on the Capabilities page.

The Capabilities page is protected at:

- Path: `capabilities/index.html`
- Baseline Git blob SHA: `ae70d0e87a1c5c1879e2b646348d28cb3255784f`
- Protection policy: content and behavior

## Repository-control baseline

At the start of the foundation branch:

- No root `package.json` existed.
- No root `README.md` existed.
- The visible Apps catalog was sourced from `apps/assets/apps-data.json`.
- The catalog contained 31 entries.
- Application presence in the catalog was not treated as proof of runtime verification.
- Existing reports included pages marked as patched but not runtime-verified.
- Existing browser tests covered only a limited subset of the portfolio routes.

## Catalog baseline

The 31 legacy catalog entries have been copied into `data/apps.registry.json` as a neutral migration inventory.

All entries begin with:

- `lifecycleStatus: pending-review`
- `verification.status: pending`

This prevents the modernization process from converting legacy catalog presence into an unsupported claim of reliability.

### Baseline deployment groups

- Local static candidates
- Local build candidates
- External deployment candidates

The compiled/WebGPU group is initially marked as `local-build-candidate` with `vite-candidate` build type so its production output can be verified before promotion.

## Known high-priority findings entering implementation

1. Multiple section roots contain copied shared code and configuration.
2. Shared navigation and runtime files appear in more than one location.
3. Several WebGPU/TypeScript applications require a confirmed build-to-route deployment process.
4. Existing runtime reports are not a substitute for browser verification.
5. Existing Playwright coverage does not represent the complete 31-application catalog.
6. Some cloud-backed demo endpoints require stronger access boundaries.
7. Blanket CORS behavior requires review.
8. Third-party API content must be rendered through safe DOM construction.
9. The application deep-dive scanner needs stronger TypeScript/module awareness.
10. Large monolithic applications require performance and maintainability review.
11. Backup and historical source material must be separated from active deployment paths without being erased.
12. The open mobile-navigation draft pull request must be evaluated against the much newer main branch before reuse.

## Baseline implementation added

The first implementation slice establishes:

- A protected restore branch
- A dedicated foundation branch
- A root Node control plane
- A canonical neutral application registry
- Registry validation
- Legacy-catalog comparison
- Local source-path checks
- Capabilities-page Git-blob protection
- Foundation-stage repository documentation
- Continuous baseline checks

## Definition of success for this stage

The baseline stage is complete when:

- the protected restore point exists;
- the foundation branch contains the control-plane files;
- the canonical registry exactly represents the 31-entry legacy catalog;
- all declared local source paths exist;
- registry validation passes;
- the protected Capabilities file matches its baseline hash;
- automated checks run on foundation changes.

## Required next implementation sequence

After the baseline checks pass:

1. Generate a full repository inventory.
2. Identify exact and diverged duplicates.
3. map deployment roots and Netlify configurations.
4. determine canonical source per application.
5. verify external deployment health.
6. verify compiled application build requirements.
7. begin application-by-application lifecycle classification.

No Capabilities-page redesign begins at the end of this sequence.
