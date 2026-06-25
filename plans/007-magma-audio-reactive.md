# MAGMA — Audio-Reactive WebGPU Compute Terrain

**Vision**: Transform Magma into an **audio-reactive volcanic landscape** where
the user sings, claps, or plays music into their microphone and the magma
chamber responds in real time — lava pulses with the beat, ash plumes dance
to frequency bands, lightning strikes on snare hits. It's a volcano that
*listens*.

**Current State**: 2739-line monolith HTML/JS with raw WebGL2 (no Three.js).
Simulated lava terrain with vertex shader displacement, particle system for
ash/smoke/embers, lightning, day/night cycle, post-processing with bloom/
vignette/chromatic aberration, HUD elements. Uses lil-gui for parameter
controls. Full diegetic sidebar.

## Architecture

```
magma/
├── index.html              # Shell: canvas + HUD overlay
├── src/
│   ├── main.ts
│   ├── core/
│   │   ├── device.ts       # WebGPU device init, WebGL2 fallback
│   │   ├── loop.ts         # Frame loop with fixed-step sim
│   │   └── params.ts       # Simulation parameter store
│   ├── sim/
│   │   ├── magma.ts        # Lava flow compute shader (lattice Boltzmann)
│   │   ├── terrain.ts      # Terrain displacement compute shader
│   │   ├── particles.ts    # Ash/ember/smoke GPU particle system
│   │   └── lightning.ts    # Lightning bolt compute shader
│   ├── audio/
│   │   ├── mic.ts          # getUserMedia + AudioContext setup
│   │   ├── analyzer.ts     # FFT analysis, beat detection, onset detection
│   │   └── react.ts        # Audio → sim parameter mapping
│   ├── shaders/
│   │   ├── lava.wgsl       # Lava displacement + coloring
│   │   ├── part.wgsl       # Particle update compute
│   │   ├── terrain.wgsl    # Terrain tessellation
│   │   ├── sky.wgsl        # Sky + sun rendering
│   │   ├── lightning.wgsl  # Lightning path compute
│   │   └── post.wgsl       # Bloom + tonemapping
│   └── ui/
│       ├── hud.ts          # Diegetic HUD (keep current style)
│       ├── sidebar.ts      # Replace lil-gui with custom UI
│       └── splash.ts       # Boot flow (keep existing)
```

## Key Upgrades

### 1. Lattice Boltzmann Magma Simulation on GPU
- Current: magma is a procedural displacement driven by `lavaLevel` uniform.
- New: run a 2D lattice Boltzmann method in a compute shader on a 128x128
  grid. Each cell stores fluid density and velocity.
- Heat source maps (vents) inject energy into specific cells.
- User can add/remove vents by clicking on the terrain.
- The fluid simulation drives the lava color, displacement, and particle
  emission rate.

### 2. Audio Reactivity Pipeline
- Web Audio API's `AnalyserNode` gives frequency data (FFT).
- Beat detection: track energy in low frequencies (40-200Hz) with a
  leaky integrator. When energy exceeds threshold * 1.5 → trigger eruption.
- Onset detection: high-frequency energy spike (>3000Hz) → trigger lightning.
- Frequency band mapping:
  - Sub-bass (20-60Hz) → lava pulse amplitude
  - Bass (60-250Hz) → magma chamber pressure / ash emission rate
  - Mid (250-2000Hz) → terrain displacement amplitude
  - High (2000-8000Hz) → particle spread / lightning probability
- User can toggle audio reactivity on/off, adjust sensitivity, or play
  an audio file instead of mic input.

### 3. Replace lil-gui with Custom Diegetic UI
- Current: lil-gui panel looks like a debug overlay.
- New: custom HTML/CSS controls styled to match the existing diegetic HUD.
- Same controls (lava flow speed, wind, particle density, etc.) but rendered
  in the app's visual language.
- lil-gui is hidden by default; accessible via a small toggle for power users.

### 4. WebGPU Compute for Particles
- Current: particle system likely runs on CPU with drawArrays for points.
- New: 200K particles entirely on GPU. Compute shader updates positions,
  velocities, lifetimes, and colors each frame.
- Particle spawn rate tied to audio energy + lava level.
- Types: ash (slow, gray, damped), ember (medium, orange, bright),
  steam (fast, white, transparent), lightning arc (instant, blue-white).
- All rendered via instanced drawing with a single point sprite shader.

### 5. Lightning as GPU Compute Paths
- Current: lightning is a 20-vertex line strip drawn every frame (if active).
- New: compute shader generates lightning paths using a fractal midpoint
  displacement algorithm on the GPU.
- Generate up to 5 simultaneous bolts, each branching 2-3 times.
- Branches fade over 200ms and are replaced when a new onset is detected.

### 6. Terrain Tessellation with WebGPU
- Current: fixed terrain mesh resolution.
- New: tessellate the terrain in the compute shader based on distance from
  camera + displacement variance.
- Close-up areas with high displacement get more triangles; flat distant
  areas get fewer.
- Target: effective resolution of 512x512 but rendered as ~60K triangles.

## Dependencies
- **Add**: None beyond Vite+TS scaffold
- **Remove**: `lil-gui` CDN, Tailwind CDN, Google Fonts (host Inter locally)

## Challenges
- Lattice Boltzmann is ~50 lines of math but needs careful boundary conditions.
  Use bounce-back boundaries at the terrain edges and open boundaries at
  vents.
- Audio API requires user gesture to start. Must keep the splash/boot flow
  and add "Enable Mic" as a gesture-accepting step.
- Audio latency: the path from mic → FFT → compute shader → pixel should be
  <50ms. Use `AudioWorklet` instead of `ScriptProcessorNode` if latency is
  too high.
- WebGPU compute on mobile: many Android devices lack compute shader support.
  Fall back to fragment-shader-based simulation.

## Verification
- Click "Enable Mic" → browser prompts for microphone permission → clicking
  starts audio reactivity
- Clap or snap → visible lightning strike within 100ms
- Play music (bass-heavy) → lava pulses with the beat, ash rate follows
- Click on terrain to add a vent → new lava fountain
- Toggle audio off → sim returns to random/ambient mode
- lil-gui hidden by default, accessible via toggle
- Runs at 30fps minimum on a 2020 laptop with audio enabled

## Order of Work
1. Set up Vite+TS scaffold with WebGPU types
2. Implement WebGPU device init with WebGL2 fallback
3. Implement lattice Boltzmann magma compute shader on 128x128 grid
4. Render lava terrain with displacement driven by fluid sim
5. Implement GPU particle system (ash, ember, steam)
6. Implement lightning compute shader with fractal branching
7. Implement audio pipeline (mic → FFT → beat/onset detection)
8. Wire audio → sim parameter mapping
9. Replace lil-gui with custom diegetic UI controls
10. Implement terrain tessellation compute shader
11. Polish HUD and splash flow
