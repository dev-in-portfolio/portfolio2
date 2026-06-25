import type { RenderDevice } from './wgpu-renderer';

export function createWebGL2Device(canvas: HTMLCanvasElement): RenderDevice | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) return null;

  const devicePixelRatio = window.devicePixelRatio || 1;
  let width = Math.floor(canvas.clientWidth * devicePixelRatio);
  let height = Math.floor(canvas.clientHeight * devicePixelRatio);
  canvas.width = width;
  canvas.height = height;

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0.02, 0.024, 0.047, 1.0);

  const renderDevice: RenderDevice = {
    backend: 'webgl2',
    canvas,
    width,
    height,
    gpuDevice: null,
    gpuContext: null,

    beginFrame() {
      gl.viewport(0, 0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    },

    endFrame() {
      // WebGL2 double-buffers automatically
    },

    resize(w: number, h: number) {
      const dpr = window.devicePixelRatio || 1;
      width = Math.floor(w * dpr);
      height = Math.floor(h * dpr);
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    },

    destroy() {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    },
  };

  return renderDevice;
}
