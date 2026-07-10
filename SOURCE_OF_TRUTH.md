# NEXUS Reforged — Source of Truth

This document records the current foundation-stage authority map for Portfolio 2. It is intentionally narrower than the final architecture and does not authorize work on the Capabilities page.

## Evidence basis

The decisions below are derived from the `reforge-foundation-inventory` artifact produced by GitHub Actions run `29110973878` at commit `aee1f14a679a62315931e07117a4469a924a73af`.

The captured inventory found:

- 7 registered roots: the root entry shell plus 6 copied section roots.
- 8 shared-file families compared across the section roots.
- 6 byte-identical shared families.
- 2 genuinely divergent shared families.
- 6 public `.bak` navigation files.
- 4 byte-identical Netlify configurations.
- 4 serverless-function roots.
- 9 function files per function root.
- 36 function copies total.
- All 9 function families byte-identical across all 4 roots.

## Current authority map

### Portfolio entry

The root `index.html` remains the current portfolio entry point.

This decision does not imply that the root is already the final consolidated deployment root. It only prevents the modernization from accidentally replacing the current NEXUS entry experience while the deployment model is still being mapped.

### Active local applications

`apps/apps/` is the canonical source location for the 20 local applications currently exposed by the Apps catalog.

The catalog route and source location are intentionally different:

```text
Public route: /apps/alibi/
Source path:  apps/apps/alibi/
```

That nested structure is preserved during the baseline phase. It will not be flattened until the build system can reproduce every route reliably.

### Legacy full-site material

`home/` remains preserved as a legacy full-site root because it contains more than a homepage copy. It includes historical application copies, help material, readme surfaces, case studies, tests, backend documentation, functions, and site-level artifacts.

It is not safe to delete or flatten `home/` as a single cleanup action.

### Capabilities

`capabilities/` is protected and excluded from intentional modernization during the foundation pass.

The current page remains hash-locked. The presence of duplicated applications or shared assets inside the Capabilities root does not authorize replacing them during this stage.

## Shared-file findings

### Safe extraction candidates

The following families are byte-identical across all 6 copied section roots:

- `shared/nexus-topnav-v2.css`
- `shared/nexus-topnav.js`
- `shared/nexus-topnav.css`
- `shared/nexus-prefs.js`
- `shared/nexus-welcome.js`
- `shared/nexusbar-inline.js`

These are candidates for a future canonical shared package or build template.

They have not been moved yet because the deployment build must exist before copied production files are removed.

### Navigation JavaScript requires reconciliation

`shared/nexus-topnav-v2.js` has 3 distinct versions:

- `home` has a unique version.
- `apps`, `about`, and `contact` share one version.
- `utilities` and `capabilities` share another version.

No version is automatically declared correct merely because it has more copies.

The variants must be compared for:

- Mobile navigation behavior
- Root-prefix handling
- Route differences
- Dropdown behavior
- Page-specific compatibility
- Relationship to the stale mobile-navigation pull request

### App-data client requires reconciliation

`shared/appdata-client.js` has 2 versions:

- `home`, `apps`, `about`, `contact`, and `capabilities` share one version.
- `utilities` has a unique version.

The Utilities version must be compared before consolidation to determine whether its difference is intentional API or storage behavior.

## Deployment findings

`home`, `apps`, `about`, and `contact` contain byte-identical `netlify.toml` files.

Each currently declares:

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

These files are candidates to be generated from one root template after the consolidated build structure is established.

## Serverless-function findings

The following 9 functions exist in all 4 Netlify roots and are byte-identical:

- `_cors.js`
- `_db.js`
- `ai-gemini-proxy.js`
- `appdata.js`
- `health.js`
- `lingolive-save.js`
- `oracle-save.js`
- `sleepystory-save.js`
- `toon-project-save.js`

These are centralization candidates, but they must not simply be copied into a new folder unchanged.

Centralization must be combined with the security workstream:

- Authentication or signed anonymous sessions
- Restricted CORS
- Input validation
- Payload limits
- Retention enforcement
- Provider timeouts
- Safe errors
- Secret-handling guarantees

## Backup artifacts

Six copies of `shared/nexus-topnav-v2.js.bak` are publicly present, one under each copied section root.

They are archive candidates, not deletion candidates.

Before relocation:

1. Hash and compare the backups.
2. Compare them with the 3 active navigation variants.
3. Record whether they contain unique historical behavior.
4. Move preserved copies into the controlled archive.
5. Remove them from active deployment output only after the archive record exists.

## Current consolidation order

1. Keep the Capabilities page protected.
2. Reconcile the 3 active `nexus-topnav-v2.js` variants.
3. Evaluate the stale mobile-navigation pull request against current main.
4. Reconcile the Utilities `appdata-client.js` variant.
5. Establish canonical shared-source directories.
6. Add a build step that distributes shared files into section output.
7. Centralize and harden the Netlify functions.
8. Generate deployment configurations from one template.
9. Archive `.bak` files and legacy duplicates.
10. Remove copied source only after route and browser tests pass.

## Prohibited shortcuts

- Do not select the majority navigation variant without behavioral review.
- Do not overwrite the Utilities app-data client with the common version without comparison.
- Do not delete `home/` as though it were only a duplicate homepage.
- Do not remove copied functions before the replacement deployment path exists.
- Do not centralize insecure functions without hardening them.
- Do not modify the Capabilities page or connect it to the new registries.

The machine-readable form of these decisions is stored in `data/migration-decisions.json`.
