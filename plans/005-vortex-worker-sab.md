# VORTEX — Web Worker + SharedArrayBuffer Real-Time Engine

**Vision**: Rewrite Vortex as a **cross-origin-isolated real-time data engine**
using SharedArrayBuffer and Web Workers. The 3248-line monolith becomes a
slim UI shell that delegates all data processing to a background worker,
achieving <1ms main-thread frame time regardless of how many assets are being
tracked.

**Current State**: 3248 lines of monolith HTML/JS. Six major crypto assets
(BTC, ETH, SOL, ATOM, DOT, INJ). Binance WebSocket feed, 3D vortex background
(Three.js), simulated price ticks, AI advisor modals, splash overlays, theme
system, audio click, multiple trading dashboards.

## Architecture

```
vortex/
├── index.html              # Minimal shell: loads worker, bootstraps UI
├── src/
│   ├── main.ts             # UI only — direct DOM manipulation, no framework
│   ├── worker/
│   │   ├── index.ts            # Web Worker entry point
│   │   ├── binance.ts          # Binance WebSocket feed (in worker)
│   │   ├── book.ts             # Order book reconstruction
│   │   ├── indicators.ts       # RSI, MACD, SMA, Bollinger (in worker)
│   │   ├── storage.ts          # IndexedDB (in worker)
│   │   └── sim.ts              # Simulated tick generation fallback
│   ├── shared/
│   │   ├── types.ts            # Shared types between UI and worker
│   │   ├── schema.ts           # SharedArrayBuffer layout definition
│   │   └── constants.ts        # Asset definitions, colors, URLs
│   └── ui/
│       ├── price-board.ts      # Real-time price display
│       ├── chart.ts            # Canvas 2D chart (rewrite with offscreen canvas)
│       ├── vortex-3d.ts        # Three.js 3D background (runs on main thread)
│       ├── order-book.ts       # Order book visualization
│       ├── ai-modal.ts         # AI advisor modal (keep existing content)
│       ├── settings.ts         # Theme/settings panel
│       └── log.ts              # Console-style event log
```

## Key Upgrades

### 1. SharedArrayBuffer for Zero-Copy Data Transfer
- Worker writes price data into a fixed-size ring buffer in a SharedArrayBuffer.
- UI reads from the same buffer via atomic loads — no postMessage, no serialization.
- Buffer layout: each asset gets 64 slots (enough for 140 seconds at 2.2s intervals),
  each slot = timestamp (f64) + price (f64) + volume (f64) = 24 bytes.
- Total: 7 assets * 64 * 24 = ~10.8 KB. Trivially small.

### 2. Cross-Origin Isolation
- Set `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` headers via Netlify's `_headers`.
- Required for SharedArrayBuffer.
- Trade-off: breaks some third-party embeds, but Vortex doesn't use any.

### 3. OffscreenCanvas for Chart Rendering
- Move chart rendering to a second Worker or use OffscreenCanvas.
- The chart worker receives raw OHLC data via the SharedArrayBuffer and
  renders directly to its canvas.
- Main thread only composites the canvas element — zero JS overhead for chart
  rendering.

### 4. Binance Feed in Worker
- WebSocket connection lives entirely in the worker.
- If the page is backgrounded, the worker continues to receive data and
  updates the SharedArrayBuffer.
- On re-focus, the UI reads the buffer and catches up instantly — no backlog
  of queued messages to process.

### 5. Order Book Reconstruction
- Current: no order book visualization.
- New: stream Binance depth snapshots + delta updates in the worker.
- Maintain a local copy of the order book (bid/ask arrays).
- UI reads snapshots from the SharedArrayBuffer (snapshot every 100ms,
  not every tick).
- Render as a depth chart (canvas 2D) or an order book table.

### 6. Technical Indicators in Worker
- Compute RSI (14), MACD (12/26/9), SMA (20, 50, 200), Bollinger Bands (20,2)
  entirely in the worker.
- Store indicator values in the SharedArrayBuffer alongside price data.
- UI reads pre-computed values — no CPU cost on main thread.
- User can toggle which indicators to display on the chart.

### 7. Module Structure (Kill the Monolith)
- Split the single 3248-line file into ~15 focused modules.
- Each module has a single responsibility and tests if possible.
- The 3D vortex background remains but is significantly slimmed down (it was
  always a visual gimmick, not the app's value).

## Dependencies
- **Add**: None for core. `three` via npm for the 3D background.
- **Remove**: All CDN scripts. Everything bundled via Vite.

## Challenges
- Cross-origin isolation breaks DevTools in some browsers if not configured
  correctly. Must test on Netlify deploy preview.
- SharedArrayBuffer atomic ops are ~50ns each — must minimize contention.
  Workers write, UI reads — no simultaneous write from UI.
- OffscreenCanvas doesn't support all Canvas2D features identically.
  Font rendering in workers is limited — may need to pre-render text
  sprites or use a symbol-only chart.
- The 3D vortex background in Three.js on the main thread must be efficient:
  <1ms frame time. Use a simple particle system with pre-computed positions.

## Verification
- Price updates at 2.2s intervals with <0.5ms main thread processing time
  per update (measured via performance.mark/measure).
- Chart renders on OffscreenCanvas at 30fps independently of main thread load.
- Order book depth shows real bid/ask levels, updates within 100ms of
  exchange data.
- RSI/MACD/Bollinger values computed and displayed.
- Page can be backgrounded for 5 minutes and re-focus shows up-to-date data
  without a burst of message processing.
- No postMessage calls on the hot path (only for initialization and commands).

## Order of Work
1. Set up Vite+TS scaffold with cross-origin isolation headers
2. Define SharedArrayBuffer layout schema
3. Implement worker with Binance WebSocket feed
4. Implement SharedArrayBuffer ring buffer for price data
5. Port UI to read from SharedArrayBuffer (remove postMessage listeners)
6. Implement OffscreenCanvas chart rendering
7. Implement order book reconstruction in worker
8. Implement technical indicators in worker
9. Port 3D vortex background (slimmed down)
10. Teardown: delete the old monolith, wire everything together
