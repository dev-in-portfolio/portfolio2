# AEON — WebGPU + Nanite-Style LOD Renderer

**Vision**: Turn Aeon from a Three.js demo into a cutting-edge WebGPU renderer with
discrete LOD system, compute-shader terrain, and ray-traced shadows. Make it the
kind of thing that makes people ask "wait, this is in a browser?"

**Current State**: 2458-line single-file HTML. Three.js r128 via CDN. Custom
onBeforeCompile shader hooks for thin-film ring iridescence. 5 planetary bodies
with warp transitions. Works but maxes out at 30fps on integrated GPUs because
everything is draw-call-heavy forward rendering.

## Architecture

```
aeon/
├── index.html              # Shell (loads bootloader)
├── src/
│   ├── boot.ts             # WebGPU adapter/device init, fallback to WebGL2
│   ├── renderer/
│   │   ├── wgpu-renderer.ts    # Main WebGPU render graph
│   │   ├── lod-manager.ts      # Nanite-style cluster LOD system
│   │   ├── shadow.ts           # Compute-shader raytraced shadows
│   │   └── post.ts             # Compute-based bloom/chromatic aberration
│   ├── bodies/
│   │   ├── saturn.ts        # Procedural gas giant with compute shader bands
│   │   ├── pluto.ts         # Displacement-mapped dwarf planet
│   │   ├── mars.ts
│   │   ├── ceres.ts
│   │   └── europa.ts
│   ├── shaders/
│   │   ├── thin-film.wgsl   # Ring iridescence (WGSL compute)
│   │   ├── terrain.wgsl     # Procedural terrain generation
│   │   ├── atmosphere.wgsl  # Atmospheric scattering compute
│   │   └── post.wgsl        # Post-processing
│   ├── ui/
│   │   ├── hud.ts           # Diegetic HUD (keep current HTML/CSS)
│   │   └── controls.ts      # Orbit/warp/scan UI wiring
│   └── utils/
│       ├── math.ts
│       └── asset-loader.ts
```

## Key Upgrades

### 1. Replace Three.js with raw WebGPU (via wgpu-native or webgpu)
- Drop all CDN scripts. Use `navigator.gpu` API directly.
- Implement a minimal math library (mat4, vec3, quat) in TS — no dependency.
- Fallback path: WebGL2 via a thin abstraction layer if WebGPU unavailable.

### 2. Nanite-Style Geometry
- Each body stored as a cluster hierarchy (not a single mesh).
- At distance > 200 units: render 200-tri proxy.
- At < 50 units: stream full-resolution (~500K triangles) via compute shader.
- LOD transitions use dither crossfade in the pixel shader — no pop.

### 3. Compute-Shader Shadows
- No more shadow maps. Run a compute shader that traces rays against a BVH
  generated from the cluster LOD.
- 1 sample per pixel at 1/4 resolution, temporal denoise over 4 frames.
- Result: pixel-perfect shadows on rings, body self-shadowing, soft penumbras.

### 4. Ring System Rewrite in WGSL
- Current thin-film effect uses OnBeforeCompile hacks on Three.js ShaderMaterial.
- Rewrite as a compute shader that evaluates thin-film interference per-fragment
  from view-angle + thickness map stored in a 2D texture.
- Add volumetric ring scattering: light that bounces between ring particles.

### 5. Warp Transition as Compute Effect
- Current warp = white overlay + camera lerp. Lame.
- New warp: compute shader that distorts the framebuffer with a tunnel projection,
  runs for 1.2 seconds, uses time-varying noise to create a hyperspace effect.
- During warp, the scene is still rendering underneath — the distortion just
  masks the transition.

### 6. Performance Budget System
- Monitor frame time via GPU timestamp queries.
- If frame time > 16ms, drop LOD bias by one level globally.
- If > 30ms (mobile), halve ring segment count, reduce particle count 50%.
- No UI needed — runs silently in the render loop.

## Dependencies
- **Add**: `@webgpu/types` (TS types only), `wgpu-matrix` (optional, small)
- **Remove**: Three.js CDN, OrbitControls CDN, Tailwind CDN

## Challenges
- WebGPU is Chrome/Edge/FF Nightly only. Must maintain WebGL2 fallback.
- Cluster LOD generation needs offline processing of each body mesh.
- WGSL is stricter than GLSL — no dynamic indexing in some paths.
- Safari still doesn't ship WebGPU by default (2026: it's behind a flag).
- The diegetic UI layer (HTML/CSS) must remain intact — don't break the
  existing user experience while gutting the renderer.

## Verification
- `npm run dev` — app loads without CDN errors
- Switch between all 5 bodies — each renders at 60fps on a dGPU
- Thin-film iridescence matches or exceeds current visual quality
- Warp transition visible and smooth
- Memory usage < 500MB for all 5 body LOD trees
- Fallback path (WebGL2) renders without errors on browser without WebGPU

## Order of Work
1. Set up Vite + TypeScript project scaffold, copy existing HTML/CSS shell
2. Implement minimal WebGPU device init with WebGL2 fallback
3. Port saturn procedural geometry to WGSL compute
4. Implement cluster LOD system
5. Port ring shader to thin-film WGSL
6. Implement compute shadow system
7. Port warp transition
8. Port remaining 4 bodies
9. Wire performance budget system
10. Test on Chrome (WebGPU), Firefox (WebGL2), Safari (WebGL2)
