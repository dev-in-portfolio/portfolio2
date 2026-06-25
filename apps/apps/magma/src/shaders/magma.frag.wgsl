@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> seed: f32;

fn hash(p: vec3f) -> f32 {
  var h = p + seed;
  h = fract(h * 0.3183 + 0.1);
  h *= 17.0;
  return fract(h.x * h.y * h.z * (h.x + h.y + h.z));
}

fn noise(x: vec3f) -> f32 {
  let i = floor(x);
  let f = fract(x);
  let ff = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3f(1,0,0)), ff.x),
        mix(hash(i + vec3f(0,1,0)), hash(i + vec3f(1,1,0)), ff.x), ff.y),
    mix(mix(hash(i + vec3f(0,0,1)), hash(i + vec3f(1,0,1)), ff.x),
        mix(hash(i + vec3f(0,1,1)), hash(i + vec3f(1,1,1)), ff.x), ff.y), ff.z);
}

fn fbm(x: vec3f) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var p = x;
  for (var i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = vec3f(uv * 4.0, time * 0.08);
  let n = fbm(p);
  let heat = n * 0.8 + 0.2;
  let col = mix(
    vec3f(0.3, 0.02, 0.0),
    vec3f(1.0, 0.6, 0.1),
    heat
  );
  let glow = heat * 0.5 + 0.1;
  return vec4f(col + vec3f(glow * 0.15, glow * 0.05, 0.0), 1.0);
}
