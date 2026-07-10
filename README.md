# NEXUS / Portfolio 2

NEXUS is an evolving portfolio platform, application catalog, experiment archive, and systems-development record. It began during the GPT-4 era through an unconventional tablet/Termux workflow and expanded across static applications, compiled browser simulations, AI interfaces, serverless functions, external deployments, and The Vault.

## Current modernization stage

The repository is in the **NEXUS Reforged — Foundation Pass**.

The foundation pass is limited to:

- protecting the current platform;
- establishing canonical inventories and source-of-truth records;
- verifying active applications;
- consolidating build and deployment behavior;
- improving tests, security boundaries, documentation, and The Vault;
- collecting evidence for later use.

The foundation pass explicitly stops before intentional changes to the Capabilities page.

## Protected page

`capabilities/index.html` is hash-protected through `data/protected-files.json` and `scripts/verify-protected-files.mjs`. It must remain unchanged until its separate future stage is authorized.

## Baseline commands

Requires Node.js 20 or newer.

```bash
npm run inventory
npm run validate
npm run test
npm run baseline
```

### `npm run inventory`

Compares the canonical application registry with the legacy Apps catalog and confirms that declared local source paths exist.

### `npm run validate`

Validates registry structure and verifies protected-file hashes.

## Current canonical data

- `data/apps.registry.json` — neutral baseline inventory of the 31 cataloged applications.
- `data/protected-files.json` — files protected during the foundation pass.
- `apps/assets/apps-data.json` — legacy catalog retained as a comparison source during migration.

All applications begin with `lifecycleStatus: pending-review` and `verification.status: pending`. The baseline registry does not claim that an application is working merely because it appears in the legacy catalog.

## Protected restore point

The pre-reforge repository state is preserved at:

- Commit: `136ef3c39e85a67a00b8a65d49370e6ad11c888e`
- Branch: `archive/portfolio2-pre-reforge-2026-07-10`

Foundation work begins on:

- Branch: `reforge/baseline`

## Modernization rule

Preserve the personality, history, unusual interfaces, and experimental record. Improve the machinery without replacing NEXUS with a generic portfolio template.
