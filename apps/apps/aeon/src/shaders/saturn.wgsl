struct Uniforms {
  modelViewProjection: mat4x4f,
  modelMatrix: mat4x4f,
  normalMatrix: mat4x4f,
  time: f32,
  sunAngle: f32,
  eclipse: f32,
  binary: f32,
  lightViewProjection: mat4x4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(1) @binding(0) var shadowSampler: sampler_comparison;
@group(1) @binding(1) var shadowTexture: texture_depth_2d;

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPos: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
};

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
) -> VSOutput {
  let worldPos = (u.modelMatrix * vec4f(position, 1.0)).xyz;
  let N = normalize((u.normalMatrix * vec4f(normal, 0.0)).xyz);
  return VSOutput(
    u.modelViewProjection * vec4f(position, 1.0),
    worldPos,
    N,
    uv,
  );
}

// --- noise helpers ---
fn hash3(p: vec3f) -> f32 {
  var r = fract(p * 0.1031);
  r += dot(r, r.yzx + 33.33);
  return fract((r.x + r.y) * r.z);
}

fn noise3(p: vec3f) -> f32 {
  let i = floor(p);
  let fv = fract(p);
  let f = fv * fv * (3.0 - 2.0 * fv);
  let n000 = hash3(i);
  let n100 = hash3(i + vec3f(1,0,0));
  let n010 = hash3(i + vec3f(0,1,0));
  let n110 = hash3(i + vec3f(1,1,0));
  let n001 = hash3(i + vec3f(0,0,1));
  let n101 = hash3(i + vec3f(1,0,1));
  let n011 = hash3(i + vec3f(0,1,1));
  let n111 = hash3(i + vec3f(1,1,1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

fn fbm(p: vec3f) -> f32 {
  var f = 0.0;
  var a = 0.5;
  var pp = p;
  for (var i = 0; i < 5; i++) {
    f += a * (noise3(pp) * 2.0 - 1.0);
    pp *= 2.0;
    a *= 0.5;
  }
  return f;
}

fn thinFilm(t: f32) -> vec3f {
  let a = 6.28318 * t;
  return vec3f(
    0.5 + 0.5 * cos(a),
    0.5 + 0.5 * cos(a + 2.1),
    0.5 + 0.5 * cos(a + 4.2),
  );
}

@fragment
fn fs_main(in: VSOutput) -> @location(0) vec4f {
  // Saturn band colors
  let c1 = vec3f(0.05, 0.14, 0.19);
  let c2 = vec3f(0.13, 0.35, 0.39);
  let c3 = vec3f(0.70, 0.48, 0.17);
  let c4 = vec3f(0.23, 0.12, 0.08);

  let N = normalize(in.normal);
  let lat = asin(N.y);
  let lon = atan2(N.z, N.x);

  let tNoise = fbm(vec3f(lon * 1.05, lat * 1.35, u.time * 0.03)) * 0.55;
  let band = sin((lat + tNoise * 0.35) * 10.8);
  let m = clamp(0.5 + 0.5 * band, 0.0, 1.0);

  var base = mix(mix(c1, c2, smoothstep(0.15, 0.60, m)), mix(c3, c4, smoothstep(0.40, 0.90, m)), m);

  // Storm spot
  let d = vec2f(lon - 1.12, lat + 0.18);
  let d2 = vec2f(d.x * 1.65, d.y * 0.95);
  base += exp(-dot(d2, d2) * 8.0) * 0.95 * vec3f(0.10, 0.06, 0.02);

  // Fresnel thin-film
  let V = normalize(u.modelMatrix[3].xyz - in.worldPos);
  let ndv = clamp(dot(N, V), 0.0, 1.0);
  let fres = pow(1.0 - ndv, 3.2);
  let N2 = N * 2.0;
  let nVal = noise3(N2 + u.time * 0.05);
  let oil = mix(vec3f(1.0), thinFilm(fres + nVal * 0.55), 0.18);
  let oilDark = mix(oil, vec3f(0.1), 0.42);
  base *= mix(vec3f(1.0), oilDark, fres);
  base *= mix(0.70, 1.0, ndv);

  // Lighting
  let sunDir = normalize(vec3f(cos(u.sunAngle), sin(u.sunAngle) * 0.6, 0.4));
  var light = max(0.0, dot(N, sunDir)) * 0.85 + 0.15;
  if (u.eclipse > 0.5) {
    light = 0.08;
  }
  if (u.binary > 0.5) {
    let sun2 = normalize(vec3f(cos(u.sunAngle + 2.5), sin(u.sunAngle + 2.5) * 0.5, 0.3));
    light += max(0.0, dot(N, sun2)) * 0.6;
  }

  return vec4f(base * light, 1.0);
}
