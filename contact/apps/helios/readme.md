# Helios - Developer Documentation

Helios is a generative visual application that leverages an iframe-based architecture to render a high-performance simulation canvas controlled by an external UI.

## Architecture & Tech Stack
- HTML5 Canvas or WebGL (in an iframe).
- Vanilla JavaScript (`helios.js`).
- Custom CSS (`helios.css`) with standard UI components.

## Key Systems / Components
- `index.html`: The host page containing the UI controls.
- `canvas.html`: The sandboxed simulation environment.
- `helios.js`: Orchestrates the UI sliders, capturing input and broadcasting changes.
- PostMessage API: Facilitates real-time parameter updates from the host page to the iframe.

## Performance & Accessibility / Development Notes
- The iframe boundary prevents complex WebGL/Canvas operations from blocking the UI thread.
- Ensure that the postMessage payload is lightweight to prevent frame drops during rapid slider movement.
- Maintain readable labels and logical tab flow in the control panel.

## Integration & DB
- Ephemeral client-side application.
- No backend database integration.
- Parameters are held in local state and reset upon page reload.