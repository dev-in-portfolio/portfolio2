# HELIX — Custom WebGL2 Molecular Renderer

**Vision**: Replace the NGL viewer dependency with a **custom molecular renderer
built from scratch in raw WebGL2**. No libraries, no CDN — just atoms, bonds,
and a hand-written GLSL ray marcher for space-filling models. This is the
"prove I can write a renderer" app.

**Current State**: 754-line single HTML. Uses NGL via embed iframe. PDB ID
input, gallery of 44 structures, preset buttons. The app wraps an existing
molecular viewer rather than being one.

## Architecture

```
helix/
├── index.html              # Shell: header, sidebar, viewport, log
├── src/
│   ├── main.ts
│   ├── renderer/
│   │   ├── gl.ts               # WebGL2 context wrapper
│   │   ├── atom-shader.ts      # Sphere impostor via ray marching
│   │   ├── bond-shader.ts      # Cylinder rendering
│   │   ├── cartoon-shader.ts   # Ribbon/cartoon secondary structure
│   │   └── fxaa.ts             # Anti-aliasing pass
│   ├── io/
│   │   ├── pdb-parser.ts       # PDB file format parser (from scratch)
│   │   ├── cif-parser.ts       # mmCIF parser (from scratch)
│   │   └── fetch.ts            # Fetch from RCSB, cache in IndexedDB
│   ├── data/
│   │   ├── residue.ts          # Amino acid / nucleotide definitions
│   │   ├── elements.ts         # Element properties (color, radius, mass)
│   │   └── secondary-structure.ts # DSSP-like assignment algorithm
│   ├── controls/
│   │   ├── orbit.ts            # Arcball camera (no Three.js!)
│   │   └── pick.ts             # Ray picking for atom selection
│   └── ui/
│       ├── gallery.ts          # Structure gallery (local + recent)
│       ├── controls.ts         # Render mode toggles
│       └── log.ts              # Console-style output
```

## Key Upgrades

### 1. Write a PDB/mmCIF Parser From Scratch
- No dependency on BioJava, NGL parsers, or any library.
- Parse atom records, connectivity, secondary structure, crystal data.
- Handle the full PDB format including alternate conformations.
- mmCIF parser handles the newer PDBx/mmCIF format (most PDB entries now use
  this).
- Store parsed data in a compact binary format: position (3xfloat32), element
  (uint8), residue index (uint16), b-factor (float16), occupancy (uint8).

### 2. Sphere Impostor Ray Marching
- Don't render spheres as geometry (too many triangles).
- Instead: render a quad, compute sphere-ray intersection in the fragment
  shader.
- Result: perfect spheres at 4 triangles per atom regardless of atom count.
- Support per-atom colors from the element table, but allow user to override
  (rainbow by residue, spectrum by b-factor, etc.).

### 3. Cylinder / Stick Bonds
- Bonds rendered as capped cylinders.
- Use a cylinder SDF ray march in the fragment shader (render as line,
  but compute the cylinder surface distance).
- Support bond order: single, double, triple, aromatic.
- Bond colors: average of two atom colors, or element-colored.

### 4. Cartoon / Ribbon Rendering
- Compute a smooth spline through backbone atoms (N-CA-C).
- Generate a ribbon surface using a tube SDF around the spline.
- Color by secondary structure: helix = magenta, sheet = yellow, loop = white.
- User can toggle between: wireframe, stick, space-filling, cartoon.

### 5. In-Memory Structure Gallery
- Current: 44 structures listed, each loads from RCSB on demand.
- New: pre-cache gallery structures in IndexedDB on first visit.
- On subsequent visits, they load instantly from local cache.
- User can also drag-and-drop .pdb or .cif files from disk.

### 6. Ray-Picking and Measurement
- Click an atom → highlight it, show element + residue + B-factor in HUD.
- Shift-click two atoms → show distance in angstroms.
- Ctrl-click three atoms → show angle.
- All computed in the pick shader (read the pick buffer, no CPU ray-casting).

### 7. Animation Trajectory Support
- If a PDB contains multiple models (NMR ensembles or MD trajectories),
  the app can play through them like a flipbook.
- Smooth interpolation between models using spherical linear interpolation
  for bonds.
- Frame rate control: 1-60 fps.

## Dependencies
- **Add**: None. Zero external dependencies. The whole point is proving you
  can write everything from scratch.
- **Remove**: All CDN scripts (NGL embed, etc.)

## Challenges
- PDB format has many edge cases (alternate locations, insertion codes,
  hybrid residues). The parser needs to handle all of them gracefully.
- 100K atoms with sphere impostors → 400K triangles + 100K ray marchers.
  Need to batch draw calls: instanced quads with per-instance atom data.
- Cartoon rendering requires computing smooth Catmull-Rom splines per chain.
  For 10K+ residue proteins, this needs to be fast.
- Element colors must match the CPK convention — users will notice if
  carbon is gray instead of dark gray.

## Verification
- Load 1CRN (46 residues, small protein) — renders instantly, atoms perfect
  spheres, bonds connected correctly.
- Load 4-letter PDB IDs from the gallery — each loads and renders.
- Parse a multi-model NMR PDB → animation plays smoothly.
- Click two atoms → distance displayed in angstroms accurate to 0.01A.
- Drag-and-drop a .pdb file from disk → renders correctly.
- No CDN requests on page load (all self-hosted).

## Order of Work
1. Set up Vite+TS scaffold
2. Write PDB parser (atom records first, skip alternate conformations)
3. Write WebGL2 context wrapper with instanced rendering
4. Implement sphere impostor ray marching shader for atoms
5. Implement stick bond rendering
6. Implement arcball camera (no Three.js)
7. Implement ray picking
8. Write mmCIF parser
9. Implement cartoon/ribbon rendering
10. Implement IndexedDB cache for gallery structures
11. Implement multi-model animation
12. Wire UI controls and polish
