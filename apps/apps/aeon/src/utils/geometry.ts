export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
}

export interface BodyLOD {
  high: Mesh;
  medium: Mesh;
  low: Mesh;
}

const LOD_SEGMENTS: [number, number][] = [
  [24, 18],   // low
  [80, 60],   // medium
  [200, 150], // high
];

function segmentsForDetail(detail: number): [number, number] {
  return LOD_SEGMENTS[Math.min(Math.max(detail, 0), 2)];
}

// --- FastMath noise port (deterministic) ---
function fract(x: number): number { return x - Math.floor(x); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }

function hash2(x: number, y: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}
function hash3(x: number, y: number, z: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123);
}

function noise2(x: number, y: number): number {
  const X = Math.floor(x), Y = Math.floor(y);
  const xf = x - X, yf = y - Y;
  const u = fade(xf), v = fade(yf);
  const a = hash2(X, Y), b = hash2(X + 1, Y), c = hash2(X, Y + 1), d = hash2(X + 1, Y + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function noise3(x: number, y: number, z: number): number {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
  const xf = x - X, yf = y - Y, zf = z - Z;
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const n000 = hash3(X, Y, Z);
  const n100 = hash3(X + 1, Y, Z);
  const n010 = hash3(X, Y + 1, Z);
  const n110 = hash3(X + 1, Y + 1, Z);
  const n001 = hash3(X, Y, Z + 1);
  const n101 = hash3(X + 1, Y, Z + 1);
  const n011 = hash3(X, Y + 1, Z + 1);
  const n111 = hash3(X + 1, Y + 1, Z + 1);
  return lerp(
    lerp(lerp(n000, n100, u), lerp(n010, n110, u), v),
    lerp(lerp(n001, n101, u), lerp(n011, n111, u), v),
    w
  );
}

function fbm3(x: number, y: number, z: number, oct = 5): number {
  let f = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) {
    f += amp * (noise3(x * freq, y * freq, z * freq) * 2 - 1);
    freq *= 2; amp *= 0.5;
  }
  return f;
}

function ridged3(x: number, y: number, z: number, oct = 5): number {
  let f = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) {
    f += amp * (1 - Math.abs(noise3(x * freq, y * freq, z * freq) * 2 - 1));
    freq *= 2; amp *= 0.5;
  }
  return f;
}

function warp3(x: number, y: number, z: number, strength = 0.6): { x: number; y: number; z: number } {
  const wx = fbm3(x + 11.1, y + 7.2, z + 3.3, 3);
  const wy = fbm3(x + 1.7, y + 19.3, z + 9.1, 3);
  const wz = fbm3(x + 5.9, y + 2.4, z + 17.8, 3);
  return { x: x + wx * strength, y: y + wy * strength, z: z + wz * strength };
}

export function createSphere(radius: number, wSeg: number, hSeg: number): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= hSeg; y++) {
    const v = y / hSeg;
    const phi = v * Math.PI;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    for (let x = 0; x <= wSeg; x++) {
      const u = x / wSeg;
      const theta = u * Math.PI * 2;
      const ct = Math.cos(theta), st = Math.sin(theta);
      const nx = sp * ct, ny = cp, nz = sp * st;
      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
    }
  }

  for (let y = 0; y < hSeg; y++) {
    for (let x = 0; x < wSeg; x++) {
      const a = y * (wSeg + 1) + x;
      const b = a + 1;
      const c = (y + 1) * (wSeg + 1) + x;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
  };
}

export function createDisplacedSphere(
  radius: number, wSeg: number, hSeg: number,
  displace: (nx: number, ny: number, nz: number) => number
): Mesh {
  const base = createSphere(1, wSeg, hSeg);
  const pos = new Float32Array(base.positions);
  const normals = new Float32Array(base.normals);

  for (let i = 0; i < pos.length / 3; i++) {
    const nx = pos[i * 3], ny = pos[i * 3 + 1], nz = pos[i * 3 + 2];
    const h = displace(nx, ny, nz);
    const factor = 1 + h / radius;
    pos[i * 3] = nx * factor * radius;
    pos[i * 3 + 1] = ny * factor * radius;
    pos[i * 3 + 2] = nz * factor * radius;
  }

  // Recompute normals via central differences
  const idx = base.indices;
  const triNorms = new Float32Array((idx.length / 3) * 3);
  for (let i = 0; i < idx.length; i += 3) {
    const ia = idx[i] * 3, ib = idx[i + 1] * 3, ic = idx[i + 2] * 3;
    const ax = pos[ia], ay = pos[ia + 1], az = pos[ia + 2];
    const bx = pos[ib], by = pos[ib + 1], bz = pos[ib + 2];
    const cx = pos[ic], cy = pos[ic + 1], cz = pos[ic + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-10) { triNorms[i] = nx / len; triNorms[i + 1] = ny / len; triNorms[i + 2] = nz / len; }
    else { triNorms[i] = 0; triNorms[i + 1] = 1; triNorms[i + 2] = 0; }
  }

  const vertCount = pos.length / 3;
  const accumN = new Float32Array(vertCount * 3);
  const accumC = new Uint16Array(vertCount);
  for (let i = 0; i < idx.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const vi = idx[i + j];
      accumN[vi * 3] += triNorms[i + j];
      accumN[vi * 3 + 1] += triNorms[i + (j === 2 ? 0 : j + 1)];
      accumN[vi * 3 + 2] += triNorms[i + (j >= 1 ? j - 1 : 2)];
    }
  }

  // fix: simpler approach
  for (let i = 0; i < vertCount; i++) {
    const nx = pos[i * 3], ny = pos[i * 3 + 1], nz = pos[i * 3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-10) {
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    }
  }

  return { positions: pos, normals, uvs: base.uvs, indices: base.indices };
}

function makeBodyFunc(displace: (nx: number, ny: number, nz: number) => number): (radius: number, detail: number) => Mesh {
  return (radius: number, detail: number) => {
    const [w, h] = segmentsForDetail(detail);
    return createDisplacedSphere(radius, w, h, displace);
  };
}

export const createSaturnBody = makeBodyFunc((nx, ny, nz) => {
  const wp = warp3(nx * 1.8, ny * 1.8, nz * 1.8, 0.55);
  const band = Math.sin((ny * 1.15 + fbm3(wp.x * 2.2, wp.y * 2.2, wp.z * 2.2, 4) * 0.35) * 12);
  const shear = ridged3(wp.x * 2.4 + 2, wp.y * 1.6, wp.z * 2.4 - 1, 5);
  let height = band * 0.20 + (shear - 0.5) * 0.40 + fbm3(wp.x * 5.5, wp.y * 5.5, wp.z * 5.5, 4) * 0.14;
  if (Math.abs(ny) > 0.62) height *= 0.6;
  return height;
});

export const createMarsBody = makeBodyFunc((nx, ny, nz) => {
  const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
  const lon = Math.atan2(nz, nx);
  const latDeg = lat * 180 / Math.PI, lonDeg = lon * 180 / Math.PI;
  const wp = warp3(nx * 2.2, ny * 2.2, nz * 2.2, 0.35);
  let height = fbm3(wp.x * 6, wp.y * 6, wp.z * 6, 5) * 0.55;
  if (latDeg > -25 && latDeg < 35 && lonDeg > -150 && lonDeg < -50) {
    const ln = (latDeg + 25) / 60, lonN = (lonDeg + 150) / 100;
    const d = Math.hypot(ln - 0.5, lonN - 0.5);
    height += Math.max(0, 1 - d * 2.1) * 2.3;
  }
  if (Math.abs(latDeg) < 18 && lonDeg > -115 && lonDeg < -35) {
    const eq = 1 - Math.abs(latDeg) / 18, dLon = Math.abs(lonDeg - (-75)) / 35;
    height -= eq * Math.max(0, 1 - dLon) * 2.8;
  }
  if (Math.abs(latDeg) > 70) height *= 0.35;
  return height;
});

export const createPlutoBody = makeBodyFunc((nx, ny, nz) => {
  ny *= 0.98;
  const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
  const lon = Math.atan2(nz, nx);
  const latDeg = lat * 180 / Math.PI, lonDeg = lon * 180 / Math.PI;
  const wp = warp3(nx * 2, ny * 2, nz * 2, 0.45);
  let height = fbm3(wp.x * 5, wp.y * 5, wp.z * 5, 5) * 0.38;
  if (latDeg > -42 && latDeg < 20 && lonDeg > -45 && lonDeg < 45) {
    const ln = (latDeg + 42) / 62, lonN = (lonDeg + 45) / 90;
    const d = Math.hypot((lonN - 0.5) * 1.5, ln - 0.55);
    height -= Math.max(0, 1 - d * 2.2) * 1.4;
  }
  const pit = noise3(nx * 9 + 7.1, ny * 9 - 2.3, nz * 9 + 1.7);
  if (pit > 0.78) height -= (pit - 0.78) * 1.4;
  return height;
});

export const createCeresBody = makeBodyFunc((nx, ny, nz) => {
  const craters = [
    { latDeg: 12, lonDeg: 30, radiusDeg: 18, depth: 1.7 },
    { latDeg: -10, lonDeg: -40, radiusDeg: 14, depth: 1.4 },
    { latDeg: 35, lonDeg: -90, radiusDeg: 10, depth: 1.2 },
  ];
  const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
  const lon = Math.atan2(nz, nx);
  const latDeg = lat * 180 / Math.PI, lonDeg = lon * 180 / Math.PI;
  const wp = warp3(nx * 2.6, ny * 2.6, nz * 2.6, 0.30);
  let height = ridged3(wp.x * 6, wp.y * 6, wp.z * 6, 5) * 0.85 + fbm3(wp.x * 10, wp.y * 10, wp.z * 10, 4) * 0.22;
  for (const c of craters) {
    const angDist = Math.hypot((latDeg - c.latDeg) * Math.PI / 180, (lonDeg - c.lonDeg) * Math.PI / 180);
    const rad = c.radiusDeg * Math.PI / 180;
    if (angDist < rad) {
      const t2 = 1 - angDist / rad;
      height += Math.sin(t2 * Math.PI) * 0.4 * 0.6 - t2 * t2 * c.depth;
    }
  }
  return height;
});

export const createEuropaBody = makeBodyFunc((nx, ny, nz) => {
  const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
  const lon = Math.atan2(nz, nx);
  const wp = warp3(nx * 2.2, ny * 2.2, nz * 2.2, 0.15);
  let height = fbm3(wp.x * 6, wp.y * 6, wp.z * 6, 4) * 0.15;
  const stripe = Math.abs(Math.sin(lon * 6) * Math.cos(lat * 2) * 0.7 + Math.sin(lon * 3 + 2) * Math.sin(lat * 4) * 0.3);
  const ridgeMask = Math.max(0, 1 - stripe * 12);
  if (ridgeMask > 0) height += ridgeMask * 0.4;
  return height;
});

export function createBodyLOD(
  bodyFunc: (radius: number, detail: number) => Mesh,
  radius: number,
): BodyLOD {
  return {
    low: bodyFunc(radius, 0),
    medium: bodyFunc(radius, 1),
    high: bodyFunc(radius, 2),
  };
}

export function createRing(innerRadius: number, outerRadius: number, segments: number): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const angle = u * Math.PI * 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    positions.push(ca * innerRadius, 0, sa * innerRadius);
    positions.push(ca * outerRadius, 0, sa * outerRadius);
    normals.push(ca, 0, sa);
    normals.push(ca, 0, sa);
    uvs.push(0, u);
    uvs.push(1, u);
    if (i < segments) {
      const a = i * 2, b = a + 1, c = (i + 1) * 2, d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
  };
}
