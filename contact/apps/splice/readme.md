# Splice - Developer Documentation

Splice is a web-based media sequencing interface designed with a highly stylized, dark "cyber" aesthetic using complex CSS backgrounds and Tailwind utilities.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Tailwind CSS (via CDN).
- Custom styling for scrollbars, glowing backgrounds (`.nxGlowBg`), and grid patterns (`.nxGrid`).

## Key Systems / Components
- Timeline/Sequencer: The core interactive component for arranging elements horizontally.
- Styling Engine: Relies heavily on CSS radial gradients, mask-images, and pseudo-elements for its neon aesthetic.
- Drag-and-Drop Handler: Logic for reordering elements within the sequence.

## Performance & Accessibility / Development Notes
- The heavy use of `filter: blur` and `mask-image` can cause rendering bottlenecks; ensure hardware acceleration is active.
- Keyboard navigation through the timeline should be implemented to ensure the sequencer is accessible.
- Be cautious of z-index stacking contexts given the numerous overlapping gradient layers.

## Integration & DB
- Operates primarily on the client side.
- Media processing (if applicable) likely occurs either via browser APIs or mocked interactions for portfolio purposes.
- Session state is kept in memory.