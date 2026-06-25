struct Uniforms {
  lightViewProjection: mat4x4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(
  @location(0) position: vec3f,
) -> @builtin(position) vec4f {
  return u.lightViewProjection * vec4f(position, 1.0);
}
