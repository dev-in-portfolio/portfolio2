# Tectonic - Developer Documentation

Tectonic is an interactive generative art application structured similarly to Helios, focusing on visual representations of seismic data via a control interface.

## Architecture & Tech Stack
- HTML5 / Canvas API.
- Vanilla JavaScript (`wyla.js` integration).
- Custom CSS (`tectonic.css`) combined with shared layout styles.

## Key Systems / Components
- Simulation Engine: A Canvas or WebGL implementation rendering the "seismic" effects.
- Control Panel: HTML inputs (type="range") that capture user tweaks.
- State Sync: Event listeners that bind the slider values to the simulation's state variables (e.g., `ctlMagnitude`, `ctlSpin`).
- Ticker UI: A dynamic header (`.ticker`) displaying real-time or mocked data readouts.

## Performance & Accessibility / Development Notes
- Real-time binding between range inputs and the render loop should be optimized to prevent stuttering.
- The use of `requestAnimationFrame` is essential for the canvas updates.
- Ensure the contrast on the ticker elements meets accessibility guidelines.

## Integration & DB
- Fully client-side application.
- No backend database; purely a visual simulation operating in the browser.