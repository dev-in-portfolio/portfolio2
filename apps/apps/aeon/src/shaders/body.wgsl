struct Uniforms {
  modelViewProjection: mat4x4f,
  modelMatrix: mat4x4f,
  normalMatrix: mat4x4f,
  time: f32,
  sunAngle: f32,
  eclipse: f32,
  binary: f32,
  bodyIndex: f32,
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
  return VSOutput(u.modelViewProjection * vec4f(position, 1.0), worldPos, N, uv);
}

fn hash3(p: vec3f) -> f32 {
  var r = fract(p * 0.1031);
  r += dot(r, r.yzx + 33.33);
  return fract((r.x + r.y) * r.z);
}

fn noise3(p: vec3f) -> f32 {
  let i = floor(p);
  let fv = fract(p);
  let f = fv * fv * (3.0 - 2.0 * fv);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3f(1,0,0)), f.x), mix(hash3(i + vec3f(0,1,0)), hash3(i + vec3f(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3f(0,0,1)), hash3(i + vec3f(1,0,1)), f.x), mix(hash3(i + vec3f(0,1,1)), hash3(i + vec3f(1,1,1)), f.x), f.y),
    f.z
  );
}

fn fbm(p: vec3f) -> f32 {
  var f = 0.0; var a = 0.5; var pp = p;
  for (var i = 0; i < 4; i++) {
    f += a * (noise3(pp) * 2.0 - 1.0);
    pp *= 2.0; a *= 0.5;
  }
  return f;
}

@fragment
fn fs_main(in: VSOutput) -> @location(0) vec4f {
  let N = normalize(in.normal);
  let lat = asin(N.y);
  let lon = atan2(N.z, N.x);

  var base: vec3f;

  // Body-specific coloring
  if (u.bodyIndex < 0.5) {
    // Mars
    let n1 = noise3(vec3f(lon * 4, lat * 3, u.time * 0.02)) * 0.5 + 0.5;
    let n2 = noise3(vec3f(lon * 8, lat * 6, 1.5)) * 0.5 + 0.5;
    let dark = vec3f(0.56, 0.22, 0.08);
    let light = vec3f(0.82, 0.45, 0.18);
    let polar = vec3f(0.72, 0.65, 0.55);
    let mask = smoothstep(0.3, 0.7, abs(lat));
    base = mix(mix(dark, light, n1 * 0.6 + n2 * 0.4), polar, mask);
  } else if (u.bodyIndex < 1.5) {
    // Pluto
    let n1 = noise3(vec3f(lon * 5, lat * 4, u.time * 0.015)) * 0.5 + 0.5;
    let dark = vec3f(0.25, 0.18, 0.12);
    let light = vec3f(0.65, 0.58, 0.48);
    let heart = vec3f(0.78, 0.72, 0.62);
    let hDist = length(vec2f(lon * 1.2, lat * 1.8));
    let heartMask = 1.0 - smoothstep(0.1, 0.6, hDist);
    base = mix(mix(dark, light, n1), heart, heartMask * 0.6);
  } else if (u.bodyIndex < 2.5) {
    // Ceres
    let n1 = noise3(vec3f(lon * 6, lat * 5, u.time * 0.01)) * 0.5 + 0.5;
    let dark = vec3f(0.18, 0.14, 0.10);
    let light = vec3f(0.50, 0.45, 0.38);
    let salt = vec3f(0.70, 0.68, 0.62);
    let saltNoise = noise3(vec3f(lon * 12, lat * 10, 2.0));
    let saltMask = smoothstep(0.55, 0.75, saltNoise);
    base = mix(mix(dark, light, n1), salt, saltMask * 0.5);
  } else {
    // Europa
    let n1 = noise3(vec3f(lon * 4, lat * 4, u.time * 0.02)) * 0.5 + 0.5;
    let dark = vec3f(0.12, 0.14, 0.16);
    let light = vec3f(0.55, 0.58, 0.62);
    let stripe = abs(sin(lon * 6.0) * cos(lat * 2.0) * 0.7 + sin(lon * 3.0 + 2.0) * sin(lat * 4.0) * 0.3);
    let ridge = smoothstep(0.7, 0.95, stripe);
    base = mix(mix(dark, light, n1), vec3f(0.70, 0.72, 0.75), ridge * 0.6);
  }

  // Lighting
  let sunDir = normalize(vec3f(cos(u.sunAngle), sin(u.sunAngle) * 0.6, 0.4));
  var light = max(0.0, dot(N, sunDir)) * 0.85 + 0.15;
  if (u.eclipse > 0.5) { light = 0.08; }
  if (u.binary > 0.5) {
    let sun2 = normalize(vec3f(cos(u.sunAngle + 2.5), sin(u.sunAngle + 2.5) * 0.5, 0.3));
    light += max(0.0, dot(N, sun2)) * 0.6;
  }

  // Shadow
  let lightPos = u.lightViewProjection * vec4f(in.worldPos, 1.0);
  let shadowUV = lightPos.xyz / lightPos.w;
  var shadow = 0.0;
  if (all(abs(shadowUV.xy) < 1.0) && shadowUV.z > 0.0) {
    shadow = textureSampleCompareLevel(shadowTexture, shadowSampler, shadowUV.xy, shadowUV.z);
  }
  let shadowTerm = 0.3 + 0.7 * shadow;
  light *= shadowTerm;

  return vec4f(base * light, 1.0);
}
