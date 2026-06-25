# TRANSIT — Deck.gl + Real Transit Data Visualization

**Vision**: Turn Transit from a generic 3D orbital scene into a **real-time
geospatial transit visualization** powered by real GTFS (General Transit Feed
Specification) data and rendered with Deck.gl at city scale. Not a space scene
anymore — this is about real-world movement of buses, trains, and people.

**Current State**: 2087-line monolith HTML/JS. Three.js r160 via CDN (with
r128 fallback). OrbitControls. Workspace layout with a 3D viewport, header,
status indicators. No clear transit data integration — it's an abstract orbital
3D scene.

## Architecture

```
transit/
├── index.html              # Shell: dark-themed transit dashboard
├── src/
│   ├── main.ts
│   ├── layers/
│   │   ├── route-layer.ts     # Deck.gl PathLayer for transit routes
│   │   ├── stop-layer.ts      # Deck.gl ScatterplotLayer for stops
│   │   ├── vehicle-layer.ts   # Deck.gl TripsLayer for real-time vehicles
│   │   ├── heat-layer.ts      # Deck.gl HeatmapLayer for passenger density
│   │   └── terrain.ts         # Deck.gl TerrainLayer (3D terrain underlay)
│   ├── data/
│   │   ├── gtfs.ts            # GTFS parser (zip → stops/routes/trips)
│   │   ├── rt.ts              # GTFS-RT real-time vehicle positions
│   │   ├── osm.ts             # OpenStreetMap building footprints
│   │   └── cache.ts           # IndexedDB cache for static GTFS
│   ├── controls/
│   │   ├── viewport.ts        # MapView with fly-to animations
│   │   ├── time.ts            # Time slider (12am → 11:59pm)
│   │   ├── filter.ts          # Route/agency/stop type filters
│   │   └── playback.ts        # Time-lapse playback controls
│   └── ui/
│       ├── info-panel.ts      # Click-to-inspect stop/route/vehicle
│       ├── legend.ts          # Route color legend
│       └── status-bar.ts      # Data freshness, vehicle count, etc.
```

## Key Upgrades

### 1. Replace Three.js with Deck.gl + MapLibre
- Drop Three.js entirely. Deck.gl is purpose-built for geospatial data
  visualization with WebGL.
- MapLibre (open-source Mapbox alternative) provides the base map tiles.
- Deck.gl layers overlay transit data with GPU-accelerated rendering.
- Result: a real map with transit data overlaid, not an abstract 3D scene.

### 2. Real GTFS Data Integration
- Fetch GTFS static data (routes, stops, trips, schedules) from a real
  transit agency (e.g., NYC MTA, London TfL, or a local agency).
- GTFS is a .zip of CSV files. Parse in a Web Worker with `papaparse` or
  a custom minimal CSV parser.
- Store parsed data in IndexedDB for offline replay.
- Display: all routes for the selected agency, colored by route type
  (bus=red, subway=blue, light rail=green, ferry=teal).

### 3. GTFS-RT Real-Time Vehicle Positions
- Connect to GTFS-RT feed (Protocol Buffers) for live vehicle positions.
- Parse in a Web Worker (protobuf decoder in WASM or JS).
- Display vehicles as animated markers moving along their routes.
- Vehicle icon shows direction, speed, and occupancy (if available).
- When a vehicle is clicked, show its trip details, schedule adherence, and
  next 5 stops.

### 4. Time-Lapse Playback
- Slider from 00:00 to 23:59.
- At each time, compute where every vehicle should be based on the GTFS
  schedule (or interpolate from RT positions if available).
- Play button animates through the day at 10x speed.
- Perfect for understanding rush hour patterns, headway gaps, and service
  frequency.
- Time display shows both sim time and real time.

### 5. City-Scale Route Network Visualization
- Deck.gl's PathLayer renders all routes as glowing tubes.
- Color by route, by headway frequency, or by delay.
- Trip count heatmap: aggregate trips passing through each area → heatmap
  shows network utilization.
- User can filter by route type, agency, or a bounding box drawn on the map.

### 6. Service Alerts
- Some GTFS-RT feeds include service alerts (delay, cancellation, detour).
- Display alerts as highlighted route segments with a warning indicator.
- Clicking an alert shows details: cause, affected stops, expected duration.

### 7. Compare Two Cities
- Split-screen mode: left = City A, right = City B.
- Same time slider controls both views.
- Compare network size, frequency, coverage.
- Preset pairs: NYC vs London, Tokyo vs Berlin, SF vs LA.

## Dependencies
- **Add**: `deck.gl` (core + layers), `maplibre-gl`, `papaparse` (GTFS CSV),
  `protobufjs` (GTFS-RT), `@loaders.gl/terrain` (optional terrain tiles)
- **Remove**: All Three.js CDN scripts

## Challenges
- GTFS datasets are large. NYC MTA's static feed is ~50MB uncompressed.
  Must parse in a worker and compress in IndexedDB.
- GTFS-RT feeds require a protobuf schema. The standard
  `gtfs-realtime.proto` compiles to JS bundle of ~10KB.
- CORS: most public GTFS feeds (MTA, TfL) have CORS headers, but some may
  not. Need a CORS proxy or use feeds known to be open.
- Deck.gl requires WebGL2. Fallback: use a 2D Canvas overlay on MapLibre
  with a simpler rendering path.
- Time-lapse for a city with 5000+ vehicles needs to batch updates. Use
  Deck.gl's `data` prop with a single flat array update per frame.

## Verification
- Load NYC MTA data: 300+ subway routes, 400+ stops, 6000+ vehicles visible
- Click a stop → shows stop name, lines serving it, next 5 arrival times
- Slide the time slider to 8am → vehicles cluster at rush hour density
- Split-screen mode: NYC vs London, both sync to same time
- Service alert visible and clickable (if any active)
- App loads in <3s on fast connection (GTFS cached after first load)
- 30fps while panning/zooming with full transit overlay visible

## Order of Work
1. Set up Vite+TS scaffold with deck.gl + maplibre
2. Implement GTFS static parser in Web Worker
3. Implement IndexedDB cache for GTFS data
4. Render route network as PathLayer with per-route colors
5. Render stops as ScatterplotLayer
6. Implement GTFS-RT parser in Web Worker
7. Render live vehicle positions as animated markers
8. Implement time-slider and time-lapse playback
9. Implement click-to-inspect for stops, routes, and vehicles
10. Implement split-screen city comparison
11. Wire service alerts
12. Polish legend, status bar, routing info panel
