struct Uniforms {
  resolution: vec2f,
  time: f32,
  intensity: f32,
  zoom: f32,
  boost: f32,
  erupt: f32,
  hotSel: f32,
  yaw: f32,
  pitch: f32,
  panX: f32,
  panY: f32,
  ufoT0: f32,
  ufoY: f32,
  ufoDir: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32(vi == 1u) * 4.0 - 1.0, f32(vi == 2u) * 4.0 - 1.0);
  return vec4f(p, 0.0, 1.0);
}

fn hash_u32(x: u32) -> u32 {
  var h = x;
  h ^= h >> 16u;
  h *= 0x7feb352du;
  h ^= h >> 15u;
  h *= 0x846ca68bu;
  h ^= h >> 16u;
  return h;
}

fn hash(p: vec3f) -> f32 {
  let q = vec3u(bitcast<u32>(p.x), bitcast<u32>(p.y), bitcast<u32>(p.z));
  let h = hash_u32(q.x ^ hash_u32(q.y + 0x9e3779b9u) ^ hash_u32(q.z + 0x7f4a7c15u));
  return f32(h) / 4294967295.0;
}

fn noise3(p: vec3f) -> f32 {
  let i = floor(p);
  let fv = fract(p);
  let f = fv * fv * (3.0 - 2.0 * fv);
  let n000 = hash(i + vec3f(0,0,0));
  let n100 = hash(i + vec3f(1,0,0));
  let n010 = hash(i + vec3f(0,1,0));
  let n110 = hash(i + vec3f(1,1,0));
  let n001 = hash(i + vec3f(0,0,1));
  let n101 = hash(i + vec3f(1,0,1));
  let n011 = hash(i + vec3f(0,1,1));
  let n111 = hash(i + vec3f(1,1,1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

fn fbm(p: vec3f) -> f32 {
  var a = 0.55;
  var s = 0.0;
  var freq = 1.0;
  var pp = p;
  for (var i = 0; i < 6; i++) {
    s += a * (noise3(pp * freq) * 2.0 - 1.0);
    freq *= 2.0;
    a *= 0.5;
    pp += vec3f(11.7, 7.2, 3.9);
  }
  return s;
}

fn sat(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }

fn sdSphere(p: vec3f, r: f32) -> f32 { return length(p) - r; }

fn raySphere(ro: vec3f, rd: vec3f, r: f32) -> f32 {
  let b = dot(ro, rd);
  let c = dot(ro, ro) - r * r;
  let h = b * b - c;
  if (h < 0.0) { return -1.0; }
  let sh = sqrt(h);
  let t0 = -b - sh;
  let t1 = -b + sh;
  return select(t1, t0, t0 > 0.0);
}

fn sunColor(heat: f32) -> vec3f {
  let deep = vec3f(0.55, 0.05, 0.08);
  let red  = vec3f(0.95, 0.16, 0.08);
  let org  = vec3f(1.05, 0.38, 0.10);
  let hot  = vec3f(1.12, 0.78, 0.42);
  var c = mix(deep, red, smoothstep(0.05, 0.45, heat));
  c = mix(c, org,  smoothstep(0.35, 0.72, heat));
  c = mix(c, hot,  smoothstep(0.62, 1.00, heat));
  return c;
}

fn angMask(a: vec3f, b: vec3f, sharp: f32) -> f32 {
  let d = dot(a, b);
  return pow(sat((d - 0.6) / 0.4), sharp);
}

fn magneticBands(n: vec3f, t: f32, hot: f32, limb: f32) -> f32 {
  let a = atan2(n.z, n.x);
  let y = n.y;
  let w = 0.35 * sin(a * 3.0 + t * 0.9) + 0.22 * sin(y * 2.2 - t * 0.7);
  let b1 = sin(a * 10.0 + w * 2.6 + t * 1.6);
  let b2 = sin(a * 18.0 - w * 1.4 - t * 1.1);
  var band = 0.5 + 0.5 * (0.65 * b1 + 0.35 * b2);
  band = smoothstep(0.55, 0.92, band);
  let gain = (0.25 + 0.85 * limb) * (0.35 + 1.25 * hot);
  return band * gain;
}

fn hotspotField(n: vec3f, t: f32, hotA: vec3f, hotB: vec3f, hotC: vec3f) -> f32 {
  let a = angMask(n, hotA, 6.0) * (0.65 + 0.35 * sin(t * 0.7 + 1.1));
  let b = angMask(n, hotB, 7.0) * (0.65 + 0.35 * sin(t * 0.6 + 2.7));
  let c = angMask(n, hotC, 5.5) * (0.65 + 0.35 * sin(t * 0.8 + 0.2));
  return sat(a + b + c);
}

fn eruptionJets(p: vec3f, dir: vec3f, t: f32, pulse: f32) -> f32 {
  let origin = dir * 1.00;
  let up = vec3f(0.0, 1.0, 0.0);
  let bend = normalize(cross(dir, up) + 0.0001);
  let jetDir = normalize(dir + bend * (0.35 * pulse));
  let v = p - origin;
  let along = dot(v, jetDir);
  let perp0 = v - jetDir * along;
  let curl = 0.25 * pulse * smoothstep(0.0, 1.2, along);
  let perp = perp0 + bend * curl * along;
  let width = mix(0.06, 0.22, pulse);
  let core = exp(-dot(perp, perp) / (width * width));
  let fall = smoothstep(-0.1, 1.6, along) * (1.0 - smoothstep(0.5, 2.6, along));
  let n = fbm(p * 2.7 + vec3f(0.0, t * 0.7, t * 0.4));
  let rag = smoothstep(-0.25, 0.55, n);
  return core * fall * rag;
}

fn ribbonSheets(p: vec3f, t: f32) -> f32 {
  let a = atan2(p.z, p.x);
  let y = p.y;
  let r = length(p.xz);
  let n = fbm(vec3f(a * 3.0, y * 2.0, t * 0.15));
  var sheet = sin(a * 14.0 + t * 1.2 + n * 2.2);
  sheet = smoothstep(0.70, 1.00, sheet);
  let shell = exp(-abs(r - 1.22) * 7.0) + 0.55 * exp(-abs(r - 1.32) * 8.0);
  return sheet * shell;
}

fn starField(uv: vec2f, t: f32, asp: f32) -> f32 {
  let u = uv * vec2f(asp, 1.0);
  let n1 = noise3(vec3f(u * 18.0, t * 0.01));
  let n2 = noise3(vec3f(u * 32.0 + vec2f(3.2, 1.1), t * 0.013));
  return smoothstep(0.955, 1.0, n1) * 0.55 + smoothstep(0.972, 1.0, n2) * 0.45;
}

fn debrisField(uv: vec2f, t: f32) -> f32 {
  let s1 = noise3(vec3f(uv * vec2f(140.0, 90.0), t * 0.25));
  let s2 = noise3(vec3f(uv * vec2f(90.0, 120.0) + vec2f(1.7, 3.1), t * 0.18));
  return smoothstep(0.985, 1.0, s1) * 0.9 + smoothstep(0.988, 1.0, s2) * 0.7;
}

fn ufo(uv: vec2f, t: f32, asp: f32) -> vec3f {
  let dt = t - u.ufoT0;
  let life = 2.8;
  let a = sat(1.0 - abs(dt - life * 0.5) / (life * 0.5));
  if (a <= 0.0) { return vec3f(0.0); }
  var x = mix(-0.15, 1.15, sat(dt / life));
  if (u.ufoDir < 0.0) { x = 1.0 - x; }
  let y = 0.50 + 0.18 * u.ufoY;
  let p = vec2f((uv.x - x) * asp, uv.y - y);
  let body = exp(-(p.x * p.x * 90.0 + p.y * p.y * 900.0));
  let dome = exp(-(p.x * p.x * 180.0 + (p.y + 0.015) * (p.y + 0.015) * 2200.0));
  let glow = exp(-(p.x * p.x * 50.0 + (p.y - 0.01) * (p.y - 0.01) * 1400.0));
  var c = vec3f(0.0);
  c += vec3f(0.20, 0.95, 1.20) * glow * 0.65 * a;
  c += vec3f(1.20, 1.05, 0.60) * body * 0.35 * a;
  c += vec3f(0.45, 0.95, 1.25) * dome * 0.55 * a;
  let trail = exp(-((p.x + 0.06) * (p.x + 0.06) * 40.0 + p.y * p.y * 1600.0));
  c += vec3f(0.22, 0.75, 1.10) * trail * 0.45 * a;
  return c;
}

fn toneMapFilmic(c: vec3f) -> vec3f {
  let cc = max(c, vec3f(0.0));
  return (cc * (2.51 * cc + 0.03)) / (cc * (2.43 * cc + 0.59) + 0.14);
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let asp = u.resolution.x / u.resolution.y;
  let uv = (fragCoord.xy + 0.5) / u.resolution;
  let uvClamped = clamp(uv, vec2f(0.0), vec2f(1.0));

  let ndc = uvClamped * 2.0 - 1.0;
  let p = vec2f(ndc.x * asp, ndc.y) + vec2f(u.panX, u.panY);
  let fov = mix(1.10, 0.74, clamp(u.zoom, 0.0, 1.0));

  // Camera rotation from yaw/pitch
  let cy = cos(u.yaw); let sy = sin(u.yaw);
  let cp = cos(u.pitch); let sp = sin(u.pitch);
  let forward = normalize(vec3f(sy * cp, sp, cy * cp));
  let right = normalize(vec3f(cy, 0.0, -sy));
  let up = cross(right, forward);
  let rd = normalize(right * p.x + up * p.y + forward * (-fov));

  let starCenter = vec3f(0.35, -0.25, 0.0);
  let ro = vec3f(0.0);
  let ro2 = ro - starCenter;

  let tt = u.time;
  let pulse = u.erupt;

  // Hotspot directions (fixed in world space)
  let hotA = normalize(vec3f(-0.62,  0.32, -0.18));
  let hotB = normalize(vec3f(-0.40,  0.10,  0.38));
  let hotC = normalize(vec3f(-0.70, -0.08,  0.10));
  let hotDir = select(select(hotC, hotB, abs(u.hotSel - 1.0) < 0.5), hotA, abs(u.hotSel) < 0.5);

  // Background
  let stars = starField(uvClamped + vec2f(sin(tt*0.03)*0.002, cos(tt*0.025)*0.002), tt, asp);
  let neb = fbm(vec3f(uvClamped * vec2f(asp, 1.0) * 2.2, tt * 0.03));
  var bg = vec3f(0.006, 0.010, 0.020) + vec3f(0.02, 0.04, 0.10) * max(0.0, neb) * 0.22;
  bg += vec3f(0.70, 0.85, 1.00) * stars * 0.55;

  let emb = debrisField(uvClamped + vec2f(tt*0.01, -tt*0.008), tt) * (0.10 + 0.22 * u.intensity);
  bg += vec3f(1.15, 0.52, 0.14) * emb * 0.65;

  var col = bg;

  // Probe position for corona (just in front of sun surface)
  let probe = normalize(ro2 + rd * 1.6 + 1e-8);
  let limbProxy = pow(1.0 - sat(dot(probe, -rd)), 1.3);
  let hotProbe = hotspotField(probe, tt, hotA, hotB, hotC);

  let d = sdSphere(ro2 + rd * 1.8, 1.0);
  var corona = exp(-abs(d) * 1.9) * (0.20 + 0.60 * u.intensity);

  let bandProbe = magneticBands(probe, tt, hotProbe, limbProxy);
  col += vec3f(0.08, 0.42, 0.95) * bandProbe * corona * (0.65 + 0.55 * u.intensity);
  col += vec3f(1.05, 0.36, 0.10) * corona * (0.30 + 0.55 * u.intensity);
  col += vec3f(1.15, 0.58, 0.18) * hotProbe * corona * (0.35 + 0.75 * u.intensity);

  let sheet = ribbonSheets(probe, tt) * (0.35 + 0.85 * u.intensity);
  col += vec3f(0.10, 0.55, 1.10) * sheet * 0.38;
  col += vec3f(1.15, 0.45, 0.12) * sheet * 0.22;

  let jets = eruptionJets(probe, hotDir, tt, pulse) * (0.30 + 0.90 * u.intensity);
  col += vec3f(1.25, 0.55, 0.14) * jets * (1.15 + 1.15 * pulse);
  col += vec3f(0.12, 0.65, 1.15) * jets * (0.35 + 0.65 * pulse);

  // Raymarch sun surface
  let tHit = raySphere(ro2, rd, 1.00);
  if (tHit > 0.0) {
    let ph = ro2 + rd * tHit;
    let n = normalize(ph);

    let conv = fbm(n * 5.0 + vec3f(0.0, tt * 0.14 * u.boost, tt * 0.09));
    let gran = fbm(n * 18.0 + vec3f(17.0, 9.0, tt * 0.50));
    var heat = 0.54 + 0.28 * conv + 0.18 * gran;
    heat = clamp(heat, 0.0, 1.0);

    let L = normalize(vec3f(-0.35, 0.55, -0.75));
    let ndl = clamp(dot(n, L), 0.0, 1.0);
    let view = clamp(dot(n, -rd), 0.0, 1.0);
    let rim = pow(1.0 - view, 2.1);
    let limb = pow(view, 0.58);

    var lit = sunColor(heat) * (0.12 + 1.05 * ndl);
    lit *= mix(0.60, 1.10, limb);
    lit += vec3f(1.10, 0.30, 0.08) * rim * (0.32 + 0.55 * u.intensity);

    let hot = hotspotField(n, tt, hotA, hotB, hotC);
    let bandsSurf = magneticBands(n, tt, hot, (1.0 - limb));
    lit += vec3f(0.12, 0.70, 1.15) * bandsSurf * (0.18 + 0.45 * u.intensity);
    lit += vec3f(1.10, 0.42, 0.12) * bandsSurf * (0.10 + 0.28 * u.intensity);
    lit += vec3f(1.25, 0.62, 0.22) * hot * (0.22 + 0.55 * u.intensity);
    lit += vec3f(0.18, 0.75, 1.20) * hot * (0.08 + 0.22 * u.intensity);

    let eSurf = eruptionJets(n, hotDir, tt, pulse);
    lit += vec3f(1.30, 0.62, 0.20) * eSurf * (0.35 + 0.85 * u.intensity) * (0.65 + 0.85 * pulse);
    lit += vec3f(0.12, 0.65, 1.25) * eSurf * (0.10 + 0.35 * u.intensity) * (0.45 + 0.65 * pulse);

    col = lit + col * 0.05;
  }

  // UFO
  col += ufo(uvClamped, tt, asp);

  // Vignette
  let vv = smoothstep(1.15, 0.22, length((uvClamped - 0.5) * vec2f(asp, 1.0)));
  col *= (0.80 + 0.35 * vv);

  // Film grain
  let g = noise3(vec3f(fragCoord.xy * 0.55, tt * 11.0));
  col *= (0.988 + 0.028 * (g - 0.5));

  col = toneMapFilmic(col);
  col = pow(col, vec3f(0.90));

  return vec4f(col, 1.0);
}
