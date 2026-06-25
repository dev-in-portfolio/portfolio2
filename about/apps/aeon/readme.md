# Aeon - Developer Documentation

Aeon is a frontend generative art application rendering interactive visuals on an iframe canvas, driven by an external control panel.

## Architecture & Tech Stack
- HTML5 Canvas API.
- Vanilla JavaScript.
- Custom CSS with CSS Variables for styling.
- Component isolation using an iframe for the canvas (`canvas.html`).

## Key Systems / Components
- `index.html`: The main entry point hosting the control panel.
- `canvas.html`: The isolated iframe where generative visuals are rendered.
- PostMessage API: Used for communication between the control panel and the iframe.

## Performance & Accessibility / Development Notes
- Ensure window resize events correctly update canvas dimensions without memory leaks.
- Render loop optimized using `requestAnimationFrame`.
- Consider adding ARIA labels to sliders for better accessibility.

## Integration & DB
- No external database integration; fully client-side and ephemeral.
- Configuration and state are maintained in-memory during the session.