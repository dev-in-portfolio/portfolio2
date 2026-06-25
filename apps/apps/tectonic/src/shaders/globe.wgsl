struct Uniforms {
  resolution: vec2f,
  time: f32,
  activity: f32,
  magnitude: f32,
  spin: f32,
  depthBias: f32,
  rotOff: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32(vi == 1u) * 4.0 - 1.0, f32(vi == 2u) * 4.0 - 1.0);
  return vec4f(p, 0.0, 1.0);
}

fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

fn hash1(n: f32) -> f32 {
  return fract(sin(n) * 43758.5453123);
}

fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let fv = fract(p);
  let f = fv * fv * (3.0 - 2.0 * fv);
  let a = hash2(i);
  let b = hash2(i + vec2f(1, 0));
  let c = hash2(i + vec2f(0, 1));
  let d = hash2(i + vec2f(1, 1));
  return mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;
}

fn rot2(a: f32) -> mat2x2f {
  let s = sin(a);
  let c = cos(a);
  return mat2x2f(c, -s, s, c);
}

fn fbm(p: vec2f) -> f32 {
  var f = 0.0;
  var a = 0.5;
  var pp = p;
  for (var i = 0; i < 5; i++) {
    f += a * noise2(pp);
    pp = rot2(0.7) * pp * 2.03 + vec2f(0.17, 0.13);
    a *= 0.55;
  }
  return f;
}

fn sphere(uv: vec2f, asp: f32) -> vec3f {
  let p = (uv - 0.5) * 2.0;
  let pp = vec2f(p.x * asp, p.y);
  let r2 = dot(pp, pp);
  let z = sqrt(max(0.0, 1.0 - r2));
  return vec3f(pp, z);
}

fn lonlat(n: vec3f) -> vec2f {
  return vec2f(atan2(n.x, n.z), asin(clamp(n.y, -1.0, 1.0)));
}

fn faultMask(ll: vec2f) -> f32 {
  let q = vec2f(ll.x * 1.25, ll.y * 1.85);
  let fg = fbm(q);
  let ridge = 1.0 - abs(fg * 2.0 - 1.0);
  let r = pow(clamp(ridge, 0.0, 1.0), 7.0);
  let micro = fbm(q * 3.2 + vec2f(3.0, 1.0));
  let mr = pow(clamp(1.0 - abs(micro * 2.0 - 1.0), 0.0, 1.0), 10.0);
  return clamp(r + 0.35 * mr, 0.0, 1.0);
}

fn starfield(uv: vec2f) -> vec3f {
  let p = uv * u.resolution / 600.0;
  let s = hash2(p);
  let star = smoothstep(0.996, 1.0, s);
  let tw = 0.6 + 0.4 * sin(u.time * 2.0 + s * 40.0);
  let dust = noise2(p * 3.0 + vec2f(u.time * 0.03, -u.time * 0.02));
  let d = smoothstep(0.72, 1.0, dust) * 0.12;
  return vec3f(0.02, 0.03, 0.07) + star * tw * vec3f(0.9, 0.95, 1.0) + d * vec3f(0.15, 0.25, 0.45);
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let asp = u.resolution.x / u.resolution.y;
  let uv = (fragCoord.xy + 0.5) / u.resolution;

  let n = sphere(uv, asp);
  if (dot(n.xy, n.xy) > 1.0) {
    return vec4f(starfield(uv), 1.0);
  }

  // Spin the globe
  let spinAngle = mix(0.05, 0.55, u.spin);
  let ca = cos(u.time * spinAngle + u.rotOff);
  let sa = sin(u.time * spinAngle + u.rotOff);
  let nx = n.x * ca - n.z * sa;
  let nz = n.x * sa + n.z * ca;
  let n2 = vec3f(nx, n.y, nz);
  let ll = lonlat(n2);

  // Lighting
  let L = normalize(vec3f(-0.35, 0.25, 0.9));
  let ndl = clamp(dot(L, n2), 0.0, 1.0);
  let light = ndl * 0.75 + 0.35;

  // Procedural continents
  let cont = fbm(vec2f(ll.x * 0.65, ll.y * 1.05));
  let cont2 = fbm(vec2f(ll.x * 2.2, ll.y * 2.2));
  let landMask = smoothstep(0.46, 0.62, cont * 0.85 + 0.18 * cont2);
  let ocean = mix(vec3f(0.02, 0.07, 0.17), vec3f(0.02, 0.15, 0.26), light);
  let land = mix(vec3f(0.05, 0.10, 0.07), vec3f(0.11, 0.18, 0.10), light);
  var base = mix(ocean, land, landMask);

  // Topo shading
  let topo = fbm(vec2f(ll.x * 4.0, ll.y * 4.0));
  base += landMask * (topo - 0.5) * vec3f(0.04, 0.05, 0.04);

  // Fault lines
  let fault = faultMask(ll);
  let flick = 0.55 + 0.45 * sin(u.time * 2.4 + fbm(ll * 6.0) * 6.0);
  let faultGlow = fault * (0.25 + 1.35 * u.activity) * flick;
  let faultCol = vec3f(0.10, 0.95, 0.85) * faultGlow;

  // Seismic wave rings
  var waves = 0.0;
  var mk = 0.0;
  for (var i = 0; i < 7; i++) {
    let seed = f32(i) + 1.0;
    let a = hash1(seed * 12.3) * 6.283185;
    let b = (hash1(seed * 7.7) * 2.0 - 1.0) * 1.2;
    var p = vec2f(a, b);
    p.x += 0.20 * sin(u.time * 0.22 + seed);
    p.y += 0.08 * cos(u.time * 0.17 + seed * 2.0);
    let d = distance(ll, p);
    mk += exp(-d * 22.0);
    let phase = fract(u.time * 0.18 + hash1(seed * 3.1));
    let r = mix(0.02, 0.55, phase);
    let ring = exp(-abs(d - r) * 55.0);
    waves += ring;
  }
  let pulse = (0.45 + 0.55 * sin(u.time * 1.25)) * (0.65 + 0.35 * u.activity);
  let depthAtten = mix(1.15, 0.55, u.depthBias);
  let mkGlow = mk * pulse * smoothstep(3.0, 9.0, u.magnitude) * depthAtten;
  let waveGlow = waves * (0.25 + 0.85 * u.activity) * smoothstep(4.2, 9.0, u.magnitude) * 0.55;

  let mkCol = vec3f(1.0, 0.55, 0.25) * mkGlow;
  let waveCol = vec3f(1.0, 0.85, 0.35) * waveGlow;

  // Night lights
  let night = pow(1.0 - ndl, 2.2);
  let cities = noise2(vec2f(ll.x * 18.0, ll.y * 24.0));
  let cityMask = smoothstep(0.93, 1.0, cities);
  let cityCol = vec3f(1.0, 0.78, 0.35) * cityMask * night * landMask * 0.65;

  // Aurora
  let pole = smoothstep(0.35, 1.15, abs(ll.y));
  let aur = fbm(vec2f(ll.x * 2.5 + u.time * 0.05, ll.y * 6.0));
  let aurMask = smoothstep(0.58, 0.78, aur) * pole;
  let aurCol = vec3f(0.20, 0.85, 0.55) * aurMask * (0.25 + 0.35 * night);

  // Atmosphere rim
  let rim = pow(1.0 - n.z, 2.15);
  let atm = vec3f(0.10, 0.26, 0.62) * rim * 0.62;

  var col = base + faultCol + mkCol + waveCol + cityCol + aurCol + atm;
  col += vec3f(0.06, 0.08, 0.12) * rim * (0.35 + 0.65 * u.activity);

  // Vignette
  let vp = uv - 0.5;
  col *= 1.0 - 0.18 * dot(vp, vp);

  return vec4f(col, 1.0);
}
