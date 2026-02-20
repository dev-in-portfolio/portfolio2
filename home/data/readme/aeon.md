# AEON — Build Notes

## What this is
A cinematic, parameter-driven warp visualizer — the “quantum vibe” lab.

## Why this exists in Nexus
These “apps” are meant to show **specific capabilities** in isolation — the same patterns used in product UI, but in a visually obvious way: realtime render loops, input mapping, state discipline, and polish.

## Abilities demonstrated
- Procedural animation loop + perf-safe rendering
- Param controls (sliders/toggles) driving visuals
- Cinematic “feel” (lighting, glow, easing)
- Clean UI layering over realtime canvas

## Implementation notes
- **Stateless by default:** reload should never corrupt state.
- **Responsive:** UI and canvas/3D viewport should resize cleanly.
- **Performance mindset:** effects are tuned to look expensive without being fragile.

## Known limits
- Some effects can be heavy on older mobile devices (particle counts, bloom-like glow).
- If your browser throttles background tabs, the animation may “jump” on return — that’s expected behavior.
