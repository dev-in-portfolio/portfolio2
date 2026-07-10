# Mobile Navigation PR #4 Evaluation

## Pull request reviewed

- PR: `#4 [codex] Fix mobile hamburger navigation`
- Created: 2026-04-18
- Base commit: `ce7d9a808ee4fcc7f1866ac1aaab477280ab7f00`
- Head commit: `d6fc0c99e9c230e54968aec9f2420680b52797b3`
- Current foundation baseline: `136ef3c39e85a67a00b8a65d49370e6ad11c888e`

## Original intent

The pull request attempted to:

- Replace horizontally scrolling mobile navigation pills with a hamburger menu.
- Preserve the desktop pill navigation.
- Fix mobile overflow in `home/tools/index.html`.
- Apply the same navigation implementation across all six section roots.

The user-facing requirement remains valid.

## Files changed by the old pull request

The PR modifies:

- Six `shared/nexus-topnav-v2.js` files.
- Six `shared/nexus-topnav-v2.css` files.
- `home/tools/index.html`.

The affected roots are:

- `home`
- `apps`
- `utilities`
- `about`
- `contact`
- `capabilities`

## Current divergence

The PR branch and current main are now diverged:

- Current main is 14 commits ahead of the PR head.
- The PR head contains one commit not present on current main.
- The common merge base is the April commit `ce7d9a8`.

Since that merge base, the repository added or substantially changed:

- The Apps systems console.
- The Vault.
- The WebGPU/Vite application group.
- Application metadata and reports.
- Multiple active application implementations.
- Root and homepage presentation.
- Utilities content and routing.

## Navigation evidence from the foundation inventory

The current six copies of `shared/nexus-topnav-v2.js` are not identical.

They form three behavioral groups:

1. `home` — unique version.
2. `apps`, `about`, and `contact` — shared version.
3. `utilities` and `capabilities` — shared standalone-site version.

The Utilities/Capabilities variant contains hostname-aware routing behavior for separate Netlify deployments. The Apps/About/Contact variant uses the standard root-prefix navigation path. The Home variant must be reviewed separately.

The old PR applies one hamburger implementation to all six copies without reconciling these current routing differences.

## Why the old pull request must not be merged

1. It is based on an obsolete repository state.
2. It overwrites three currently distinct navigation behaviors.
3. It touches the protected Capabilities root during the foundation pass.
4. It was tested against the April architecture, not the current Apps/Vault/WebGPU layout.
5. It does not account for the current standalone Utilities and Capabilities host routing.
6. Merging it would bypass the new source-of-truth and protected-file controls.

## Decision

PR #4 is superseded and should be closed without merge.

Closing the pull request does not reject the mobile requirement. It rejects reusing the obsolete implementation unchanged.

## Replacement requirement

A new mobile-navigation implementation must:

- Start from the current `reforge/baseline` architecture.
- Preserve the three observed routing behaviors until they are intentionally unified.
- Use a canonical navigation data model rather than six hand-edited copies.
- Support keyboard operation, focus return, Escape-to-close, and visible focus.
- Prevent horizontal overflow at phone widths.
- Preserve desktop navigation.
- Test root, Apps, Utilities, About, Contact, and Capabilities routes independently.
- Avoid intentional changes to the Capabilities page during the foundation pass.
- Treat any Capabilities-root compatibility change as separately documented work.

## Required test matrix for the replacement

- 390 × 844 phone viewport.
- 412 × 915 phone viewport.
- 768 × 1024 tablet viewport.
- 1366 × 768 desktop viewport.
- Keyboard-only open, navigate, close, and focus return.
- Escape key close.
- Outside-click close.
- No horizontal document overflow.
- Correct links on the main host.
- Correct links on standalone Utilities host.
- Correct links on standalone Capabilities host.
- No new console errors.

The replacement should be implemented only after the shared navigation source and build-distribution mechanism are established.
