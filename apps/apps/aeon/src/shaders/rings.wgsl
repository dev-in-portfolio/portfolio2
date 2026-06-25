struct Uniforms {
  modelViewProjection: mat4x4f,
  modelMatrix: mat4x4f,
  time: f32,
  innerRadius: f32,
  outerRadius: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPos: vec3f,
  @location(1) normal: vec3f,
  @location(2) localPos: vec3f,
};

@vertex
fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
) -> VSOutput {
  let worldPos = (u.modelMatrix * vec4f(position, 1.0)).xyz;
  let N = normalize((u.modelMatrix * vec4f(normal, 0.0)).xyz);
  return VSOutput(
    u.modelViewProjection * vec4f(position, 1.0),
    worldPos,
    N,
    position,
  );
}

fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let a = hash(i);
  let b = hash(i + vec2f(1, 0));
  let c = hash(i + vec2f(0, 1));
  let d = hash(i + vec2f(1, 1));
  let u2 = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u2.x) + (c - a) * u2.y * (1.0 - u2.x) + (d - b) * u2.x * u2.y;
}

fn fbm(p: vec2f) -> f32 {
  var f = 0.0;
  var a = 0.5;
  var pp = p;
  for (var i = 0; i < 5; i++) {
    f += a * noise(pp);
    pp *= 2.0;
    a *= 0.5;
  }
  return f;
}

fn thinFilm(t: f32) -> vec3f {
  let a = 6.28318 * t * 1.28;
  return vec3f(
    0.5 + 0.5 * cos(a),
    0.5 + 0.5 * cos(a + 2.1),
    0.5 + 0.5 * cos(a + 4.2),
  );
}

@fragment
fn fs_main(in: VSOutput) -> @location(0) vec4f {
  let r = length(in.localPos.xz);
  let t = clamp((r - u.innerRadius) / (u.outerRadius - u.innerRadius), 0.0, 1.0);

  let noiseCoord = vec2f(t * 9.0, 1.2 + u.time * 0.02);
  let bands = smoothstep(0.05, 0.85, fbm(noiseCoord));
  let gaps = smoothstep(0.25, 0.75, fbm(vec2f(t * 26.0, 7.1))) * 0.55;
  let density = clamp(bands - gaps * 0.6, 0.0, 1.0);

  let V = normalize(u.modelMatrix[3].xyz - in.worldPos);
  let ndv = clamp(dot(normalize(in.normal), V), 0.0, 1.0);
  let fres = pow(1.0 - ndv, 3.2);

  let n = fbm(vec2f(t * 6.2, u.time * 0.03));
  let iri = thinFilm(fres + n * 0.55);

  let base = mix(vec3f(0.08, 0.10, 0.12), vec3f(0.75, 0.78, 0.82), density * 0.9);
  let oil = mix(vec3f(1.0), iri, 0.62);
  let oilDark = mix(oil, vec3f(0.1), 0.16);

  let col = base * mix(vec3f(1.0), oilDark, fres);
  let edge = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t));
  let alpha = 0.92 * density * edge;

  return vec4f(col, alpha);
}
