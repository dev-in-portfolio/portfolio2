# Splice - Developer Documentation

Splice is a web-based media sequencing interface designed with a highly stylized, dark "cyber" aesthetic using complex CSS backgrounds and Tailwind utilities.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Tailwind CSS (via CDN).
- Custom styling for scrollbars, glowing backgrounds (`.nxGlowBg`), and grid patterns (`.nxGrid`).

## Key Systems / Components
- Timeline/Sequencer: Normalizes each clip into a structured timeline record with trim bounds, beat marker, transition intent, hold timing, and notes.
- Sequence Summary: Derives runtime, beat count, average pacing, and dominant transition mode from the normalized timeline state.
- Pacing Diagnostics: Generates operator-facing warnings about missing intro/CTA beats, overly short or long segments, and transition imbalance.
- Styling Engine: Relies heavily on CSS radial gradients, mask-images, and pseudo-elements for its neon aesthetic.
- Project Export: Emits beat-aware project JSON plus a plain-text sequence brief so timeline decisions survive outside the app.

## Performance & Accessibility / Development Notes
- The heavy use of `filter: blur` and `mask-image` can cause rendering bottlenecks; ensure hardware acceleration is active.
- Keyboard navigation through the timeline should be implemented to ensure the sequencer is accessible.
- Be cautious of z-index stacking contexts given the numerous overlapping gradient layers.
- Transition selection is currently planning metadata; `holdAfter` affects both sequence playback and the render path now, while transition type is carried into export for downstream use.

## Integration & DB
- Operates primarily on the client side.
- Media processing (if applicable) likely occurs either via browser APIs or mocked interactions for portfolio purposes.
- Session state is persisted locally in browser storage and rehydrated into the normalized timeline shape when possible.
