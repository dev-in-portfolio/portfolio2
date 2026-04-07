# Transit - Developer Documentation

Transit is a client-side 3D exploration product built around exoplanet transit discovery. It uses Three.js for rendering, but the app now layers product structure on top of the scene: mission flow, authored waypoints, and explanation overlays.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Three.js (via CDN) for 3D rendering.
- `OrbitControls.js` for camera interaction.

## Key Systems / Components
- Scene Graph: Manages the 3D objects, meshes, and lighting within the Three.js environment.
- Camera Controller: Integrates OrbitControls to allow intuitive user navigation of the scene.
- Render Loop: Utilizes `requestAnimationFrame` to continuously update the WebGL context.
- Mission Layer: Tracks the current discovery route, active step, target system, and operator-facing signal state.
- Challenge Logic: Evaluates mission checkpoints against explicit route conditions and records completions in local mission memory.
- Waypoint System: Stores authored camera positions and retargets the Three.js camera/controls through lightweight tweens.
- Cinematic Replay: Runs the current mission as an authored route using the same waypoint and mission-step data rather than a separate one-off demo path.
- Context Overlay: Converts live simulation state into explanation copy tied to the current mission step and waypoint.

## Performance & Accessibility / Development Notes
- The Three.js library is loaded via CDN; ensure fallback mechanisms (like the provided backup CDN) are tested.
- 3D rendering is power-hungry; implement mechanisms to pause the render loop when the tab is not in focus.
- Consider adding ARIA roles to the UI overlays, though making the canvas itself accessible requires specialized techniques.
- The mission and context layers are intentionally app-local and persisted through the existing `localStorage` state seam, avoiding any cross-app shared refactor in this portfolio repo.
- Mission completion is intentionally criteria-aware but user-driven; checkpoints only advance automatically during cinematic replay, not during normal browsing, to avoid surprising step skips.

## Integration & DB
- Primarily a frontend demonstration.
- No backend database integration.
- 3D models or textures may be fetched asynchronously, but the logic is handled client-side.
