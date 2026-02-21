# MAGMA OMEGA — Enter Magma Chamber — Build Notes

## What this is
A magma chamber experience — layered UI with dynamic, molten visuals.

## Why this exists in Nexus
These “apps” are meant to show **specific capabilities** in isolation — the same patterns used in product UI, but in a visually obvious way: realtime render loops, input mapping, state discipline, and polish.

## Abilities demonstrated
- Layered UI + motion design
- Background effects without stealing interaction
- Accessible contrast + readable type over effects
- Mobile-friendly viewport behaviors

## Implementation notes
- **Stateless by default:** reload should never corrupt state.
- **Responsive:** UI and canvas/3D viewport should resize cleanly.
- **Performance mindset:** effects are tuned to look expensive without being fragile.

## Known limits
- Some effects can be heavy on older mobile devices (particle counts, bloom-like glow).
- If your browser throttles background tabs, the animation may “jump” on return — that’s expected behavior.
