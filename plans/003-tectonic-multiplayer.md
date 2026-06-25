# TECTONIC — Real-Time Collaborative Seismic Simulator

**Vision**: Turn Tectonic from a solo USGS-dashboard into a **multiplayer
seismic sandbox** where users can "nudge" tectonic plates and watch quake
ripples spread across everyone's connected sessions. Each client runs the same
simulation deterministically — user actions are synced via WebSocket.

**Current State**: 189-line JS parent + 357-line iframe canvas + 124-line CSS.
Controls for activity/magnitude/spin/depth. USGS earthquake feed. Mini chart.
Communicates with iframe canvas via postMessage.

## Architecture

```
tectonic/
├── index.html              # Shell: canvas + sidebar + feed
├── src/
│   ├── main.ts             # Boot, connect to relay, loop
│   ├── sim/
│   │   ├── plates.ts       # Plate boundary model (deterministic)
│   │   ├── stress.ts       # Stress accumulation compute shader
│   │   ├── rupture.ts      # Rupture propagation (cellular automaton)
│   │   └── wave.ts         # Surface wave propagation (2D wave equation)
│   ├── net/
│   │   ├── relay.ts        # WebSocket to public relay (e.g. PartyKit)
│   │   ├── sync.ts         # Deterministic lockstep sync
│   │   └── presence.ts     # Cursor/avatar positions of other users
│   ├── shaders/
│   │   ├── stress.wgsl     # Stress field compute
│   │   ├── wave.wgsl       # Wave propagation compute
│   │   └── terrain.wgsl    # Terrain deformation vertex shader
│   ├── data/
│   │   ├── usgs.ts         # USGS feed (still pulls live data)
│   │   └── plates.ts       # Plate boundary GeoData
│   └── ui/
│       ├── sidebar.ts      # Controls panel (rewritten as Lit or vanilla)
│       ├── feed.ts         # Earthquake feed
│       └── minimap.ts      # 2D minimap of the simulation
```

## Key Upgrades

### 1. Deterministic Simulation Lockstep
- All clients run identical physics (same seed, same time step).
- User actions ("nudge Pacific plate west") are broadcast as tiny commands.
- Commands are ordered by a global tick counter from the relay.
- Every N ticks, clients send a hash of their sim state; if mismatched,
  the relay snapshots the authoritative state.
- No server-side simulation — just coordination.

### 2. 2D Wave Equation on GPU
- Current: mini chart draws a 1D signal.
- New: full 2D wave equation running in a compute shader (256x256 grid).
- User clicks on the map → deposits stress at that point.
- Stress propagates as waves that interfere constructively.
- When stress at a cell exceeds threshold → rupture (earthquake) spawns
  a P-wave and S-wave that ripple outward.
- Waves perturb the 3D terrain mesh in real time.

### 3. 3D Terrain with Dynamic Deformation
- Current: likely a flat canvas.
- New: WebGPU/WebGL2 render a 256x256 displacement-mapped tile.
- The compute shader updates the displacement map each frame based on
  accumulated stress and wave propagation.
- User sees the ground bulge, crack, and settle.
- Color the terrain by stress (green = calm, red = critical).

### 4. Multiplayer Presence
- Small avatars/cursors appear on the map for other connected users.
- Each avatar shows their username and current action (e.g. "nudging plate").
- When someone triggers a quake, all clients see the same rupture.
- Chat overlay for coordination (optional, could be annoying).
- Show a "connected: N operators" indicator.

### 5. USGS Feed as Calibration
- Keep fetching USGS real quakes.
- When a real quake happens (e.g. M6.2 in California), the sim can
  optionally inject it — spawning a rupture at the real epicenter.
- Creates a "sim vs reality" split view: left = sim, right = USGS data map.

### 6. Replay System
- Every command is timestamped and logged locally.
- User can rewind to any past tick and play forward.
- Export the command log as JSON → others can load and replay.
- Perfect for debugging sync issues and for portfolio demos.

## Dependencies
- **Add**: `partykit` or `gun.js` for lightweight relay, `cbor` for binary
  command serialization
- **Remove**: All CDN scripts, iframe structure

## Challenges
- Deterministic lockstep is hard in JS because of floating-point.
  Use a fixed-point math library for sim state, or use `Math.fround()`.
- WebSocket relay adds latency. Target: <100ms between action and remote
  visibility. If >200ms, the action happens on the next tick boundary.
- The wave equation needs to be stable at 60Hz. Use a simple central
  difference scheme with CFL condition check.
- Must degrade gracefully: single-player when offline (no relay needed).

## Verification
- Two browser tabs side by side: nudge in tab A → wave visible in tab B
- Terrain deforms under stress and recovers after rupture
- USGS toggle: real quake history visible alongside sim quakes
- Replay export → import in fresh session → identical timeline
- Works offline with full functionality (no relay dependency for core sim)

## Order of Work
1. Set up Vite+TS scaffold, inline the canvas
2. Implement deterministic plate model (just a few rigid bodies with springs)
3. Implement stress compute shader on 256x256 grid
4. Implement 2D wave equation compute shader
5. Render deformation on 3D terrain mesh
6. Implement WebSocket relay with PartyKit
7. Implement lockstep sync with state hash verification
8. Implement multiplayer presence (avatars, cursors)
9. Wire USGS feed as optional calibration
10. Implement replay system with JSON export
11. Polish minimap and sidebar
