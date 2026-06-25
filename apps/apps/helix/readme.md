# Helix - Developer Documentation

Helix (Epic Protein Lab v3.1) is a generative simulation app designed to visualize complex structures utilizing HTML5, CSS variables, and JavaScript-based rendering.

## Architecture & Tech Stack
- Vanilla JavaScript.
- Custom styling with complex gradients and CSS variables.
- Likely relies on Canvas/WebGL for rendering intricate visual models.

## Key Systems / Components
- UI Panel: Built with custom CSS to provide a dark-themed, translucent interface.
- Rendering Engine: Manages the display and animation loop of the molecular structures.
- Event Manager: Handles user inputs for orbiting, zooming, and tweaking simulation variables.

## Performance & Accessibility / Development Notes
- Render loops must be strictly tied to `requestAnimationFrame` to ensure smooth performance.
- CSS backdrop-filters are used for the UI; monitor for performance hits on lower-end devices.
- Ensure the canvas handles resizing events gracefully to avoid pixelation.

## Integration & DB
- Client-side only.
- No external database or API integration required for core functionality.
- State is managed within the session.