# STRING THEORY (4D Manifold Lab) - Developer Documentation

STRING THEORY is a high-performance WebGL application using Three.js for rendering complex mathematical surfaces (4D manifolds) with advanced post-processing pipelines.

## Architecture & Tech Stack
- **Engine**: Three.js (v0.160.0).
- **Post-Processing**: Uses `EffectComposer` with `RenderPass`, `ShaderPass`, `SSAOPass` (T168), and `UnrealBloomPass` (T159) for cinematic rendering.
- **Styling**: Raw CSS with extensive use of CSS variables for a dark-mode, glassmorphism UI theme.
- **Layout**: CSS Flexbox and custom viewport height variables (`--svh`) to handle mobile browser chrome.

## Key Components
- **Canvas (`#glCanvas`)**: The primary WebGL rendering target. It includes pointer event handling for orbital controls.
- **Shader Pipeline**: Integrates custom luminosity high-pass filters and SSAO to give depth and glow to the abstract geometry.
- **UI Overlay**: Absolute positioned HTML elements overlaying the WebGL context, designed to not capture pointer events where unnecessary (`pointer-events: none`).

## Performance Optimizations
- **Event Handling**: Implements `touch-action: none` on the canvas to prevent default browser scrolling during 3D interactions.
- **Lazy Rendering**: The application may throttle rendering when idle depending on the internal loop implementation.

## Deployment Notes
- All Three.js dependencies are loaded via `unpkg.com` CDNs. Ensure network access or bundle these scripts if deploying to a strictly offline environment.
