# Magma - Developer Documentation

Magma (MAGMA OMEGA) is a high-end 3D visualizer leveraging WebGL to render complex, generative atmospheric scenes with interactive controls.

## Architecture & Tech Stack
- WebGL / Three.js (likely, given the 3D nature).
- Tailwind CSS (via CDN) for structural UI components.
- `lil-gui` library for the interactive parameter adjustment panel.

## Key Systems / Components
- 3D Scene Controller: Manages the WebGL context, cameras, lighting, and object rendering.
- Particle/Shader System: Drives the "magma" visual effects and animations.
- GUI Integration: The `lil-gui` instance bound to the scene's uniforms and state variables for real-time updates.

## Performance & Accessibility / Development Notes
- Due to the intensive rendering, the application must monitor frame rates and ideally scale down visual fidelity on lower-end devices.
- Keep shader complexity in check; optimize fragment shaders to prevent GPU overheating.
- Ensure the `lil-gui` overlay does not obstruct essential touch interactions on mobile devices.

## Integration & DB
- Fully client-side application.
- No backend database integration.
- Custom parameters might be temporarily stored in local state or URL hashes, but primarily function dynamically.