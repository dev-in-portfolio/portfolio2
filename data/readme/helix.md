# HELIX — Epic Protein Lab (v3.1) — Build Notes

## What this is
A protein structure playground — gallery + pseudo-3D viewport + preset logging.

## Why this exists in Nexus
These “apps” are meant to show **specific capabilities** in isolation — the same patterns used in product UI, but in a visually obvious way: realtime render loops, input mapping, state discipline, and polish.

## Abilities demonstrated
- Data-driven UI (presets, gallery, logging)
- 3D-ish viewport (camera-like controls / transforms)
- Componentized panels + status output
- Good UX affordances (copy, reset, presets)

## Implementation notes
- **Stateless by default:** reload should never corrupt state.
- **Responsive:** UI and canvas/3D viewport should resize cleanly.
- **Performance mindset:** effects are tuned to look expensive without being fragile.

## Known limits
- Some effects can be heavy on older mobile devices (particle counts, bloom-like glow).
- If your browser throttles background tabs, the animation may “jump” on return — that’s expected behavior.
