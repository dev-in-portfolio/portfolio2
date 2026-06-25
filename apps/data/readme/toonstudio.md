# ToonStudio — README

**A creative tooling demo: studio workflow, iterative controls, and exportable outputs.**

## Overview
ToonStudio demonstrates how to build a creative tool as a product. The hard part is not ‘make something pretty’—it’s making the workflow intuitive.

## What it demonstrates
- **Studio workflow**: baseline → refine → export.
- **Predictable controls** with clear labels.
- **Iteration loops** that don’t punish experimentation.
- **Graceful fallbacks** for demo mode.

## Project structure
Key folders:

- `apps/toonstudio/`
- `shared/`
- `data/`


## Run locally
Serve locally and open `/apps/toonstudio/`. If generation depends on providers, keep the DEMO outputs enabled for portfolio viewing.

## Deploy
Static deploy is sufficient for demo mode. If you add a backend later, keep client keys out of the browser and provide an offline demo path.

## Notes
Creative apps live or die on UX pacing. Prefer ‘simple first, advanced later’ and keep the user in control.

## Roadmap
- Add project library (export/import).
- Add storyboard timeline view.
- Add “style presets” and quick remix buttons.

---
_Last updated: 2026-02-11_
