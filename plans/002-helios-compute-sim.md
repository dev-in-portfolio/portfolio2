# HELIOS — GPU Compute Shader Solar Simulator

**Vision**: Turn Helios from a passive NOAA-data dashboard into a browser-based
solar physics simulator where the user can *run the sun* — adjust core fusion
parameters and watch magnetic field lines, coronal loops, and CMEs evolve in
real time via GPU compute shaders.

**Current State**: 156-line JS parent + 634-line HTML iframe canvas + 99-line CSS.
Polls NOAA APIs for Kp index, solar wind, magnetic field, x-ray flux. Sends
state to an iframe via postMessage. The iframe presumably does a particle
animation but it's disconnected — the parent is just a control panel with
telemetry readouts.

## Architecture

```
helios/
├── index.html          # Thinner shell — just nav + canvas container
├── src/
│   ├── main.ts         # Boot, GL context init, loop
│   ├── sun/
│   │   ├── core.ts         # Fusion simulation (compute shader)
│   │   ├── mag-field.ts    # Magnetic field line integrator (compute)
│   │   ├── corona.ts       # Coronal loop renderer
│   │   └── cme.ts          # CME particle ejection simulation
│   ├── data/
│   │   ├── noaa-fetcher.ts # Background fetch, uses Cache API
│   │   └── telemetry.ts    # Real-time telemetry buffer
│   ├── shaders/
│   │   ├── core.wgsl       # Fusion reaction compute
│   │   ├── mag.wgsl        # Biot-Savart field integration
│   │   ├── corona.wgsl     # Loop rendering
│   │   └── cme.wgsl        # Particle physics compute
│   └── ui/
│       ├── controls.ts     # Fusion sliders (density, temp, rotation)
│       └── telemetry.ts    # Real-time TUI-style readout
```

## Key Upgrades

### 1. Kill the iframe — inline the canvas
- The iframe postMessage architecture adds latency and complexity.
- Replace with a single full-window WebGPU canvas.
- Parent sliders directly modify uniform buffers — no serialization.

### 2. GPU Compute Fusion Core
- Simulate the sun as a 3D grid of cells (128^3) in a compute shader.
- Each cell stores: temperature, density, pressure, fusion rate.
- Run ~10 simulation steps per rendered frame.
- Visualize the core as a cross-section heatmap with an adjustable cutting plane.
- Parameters: core density, fusion cross-section, rotation rate.
- Result: if the user cranks density too high, the sim goes red giant (visual
  expansion + cooling). Crank it too low → the sun dims and contracts.

### 3. Real Magnetic Field Lines
- Current: NOAA pulls Bz value. Not visual.
- New: compute shader integrates magnetic field lines using Biot-Savart from
  the simulated current density in the core.
- Render 200+ field lines as tube geometry with color = field strength.
- When user triggers "eruption", field lines reconnect (scripted topology
  change in the compute shader) and a CME particle burst fires.

### 4. CME Particles
- Compute shader manages ~500K particles.
- Each particle has position, velocity, temperature, age.
- On eruption: spawn a wave of particles from the reconnection site with
  initial velocity along the opened field lines.
- Particles glow and fade over ~10 seconds.
- Without eruption: background solar wind particles stream outward.

### 5. NOAA Data as Boundary Conditions
- Keep the API fetches but use them as real boundary conditions.
- Measured Kp index → adjust coronal heating level.
- Measured solar wind speed → adjust particle ejection velocity floor.
- Measured Bz → seed the initial magnetic dipole tilt.
- Display live comparison: SIM vs REAL telemetry side by side.

### 6. Time-Lapse Recording
- User can record a 30-second simulation sequence.
- Frames are captured via `copyTextureToBuffer` and encoded to a WebM
  via `VideoEncoder` API.
- Saved as a `.webm` download.
- Perfect for portfolio — shows the sun evolving under different parameters.

## Dependencies
- **Add**: Nothing beyond a Vite/TypeScript scaffold
- **Remove**: All CDN scripts (Three.js, Tailwind), iframe structure

## Challenges
- Solar physics is complex. The sim needs to *look* real without actually
  solving MHD equations — procedural approximation is fine.
- Field line integration at 60fps requires ≤2ms compute shader time.
  Use a fixed-step Runge-Kutta 4 on the GPU with max 1024 steps per line.
- CME particles at 500K → use GPU particle system with double-buffered
  position buffers.
- Must work on WebGL2 fallback — simplify compute to fragment-shader-based
  simulation (less accurate but works everywhere).

## Verification
- User can adjust core density slider → visible change in core cross-section
- Magnetic field lines respond to eruption button within 1 second
- Telemetry readout shows both SIM values and NOAA real values
- Recording exports a playable .webm under 10MB for 30s at 720p
- Runs at 30fps minimum on a 2020 laptop dGPU

## Order of Work
1. Inline canvas into parent page, set up Vite+TS scaffold
2. Implement compute shader for 128^3 fusion core
3. Implement field line integration compute shader
4. Render field lines with tube geometry
5. Implement CME particle system
6. Wire NOAA fetcher as boundary condition input
7. Wire UI controls (density/temp/rotation/erupt)
8. Implement time-lapse recording
9. Test and tune performance budget
10. Polish telemetry display (TUI-style)
