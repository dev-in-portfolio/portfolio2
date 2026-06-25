struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOutput {
  let pos = array(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  return VSOutput(vec4f(pos[vi], 0.0, 1.0), pos[vi] * 0.5 + 0.5);
}

@group(0) @binding(0) var<uniform> uTime: f32;
@group(0) @binding(1) var<uniform> uResolution: vec2f;

@fragment
fn fs_main(in: VSOutput) -> @location(0) vec4f {
  let seed = dot(in.uv, vec2f(12.9898, 78.233));
  let star = fract(sin(seed) * 43758.5453);
  let threshold = 0.997;
  let alpha = smoothstep(threshold, 1.0, star) * 0.85;
  let twinkle = sin(uTime * 0.8 + seed * 100.0) * 0.5 + 0.5;
  let brightness = 0.4 + 0.6 * twinkle;
  return vec4f(vec3f(brightness), alpha);
}
