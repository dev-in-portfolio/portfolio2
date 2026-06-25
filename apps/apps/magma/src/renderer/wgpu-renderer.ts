export type RenderBackend = 'webgpu' | 'webgl2';

export interface RenderDevice {
  backend: RenderBackend;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;

  beginFrame(): void;
  endFrame(): void;
  resize(w: number, h: number): void;
  destroy(): void;

  readonly gpuDevice: GPUDevice | null;
  readonly gpuContext: GPUCanvasContext | null;
}

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<RenderDevice> {
  const nav = navigator as any;
  if (!nav.gpu) {
    throw new Error('WebGPU not available');
  }

  const adapter = await nav.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No WebGPU adapter found');
  }

  const device: GPUDevice = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext | null;
  if (!context) {
    throw new Error('Could not get WebGPU canvas context');
  }

  const format = nav.gpu.getPreferredCanvasFormat();
  const devicePixelRatio = window.devicePixelRatio || 1;
  let width = Math.floor(canvas.clientWidth * devicePixelRatio);
  let height = Math.floor(canvas.clientHeight * devicePixelRatio);
  canvas.width = width;
  canvas.height = height;

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  let commandEncoder: GPUCommandEncoder | null = null;
  let renderPass: GPURenderPassEncoder | null = null;

  const renderDevice: RenderDevice = {
    backend: 'webgpu',
    canvas,
    width,
    height,
    gpuDevice: device,
    gpuContext: context,

    beginFrame() {
      commandEncoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();
      renderPass = (commandEncoder as any).beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.02, g: 0.024, b: 0.047, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
    },

    endFrame() {
      if (renderPass) {
        (renderPass as any).end();
        renderPass = null;
      }
      if (commandEncoder) {
        device.queue.submit([(commandEncoder as any).finish()]);
        commandEncoder = null;
      }
    },

    resize(w: number, h: number) {
      const dpr = window.devicePixelRatio || 1;
      width = Math.floor(w * dpr);
      height = Math.floor(h * dpr);
      canvas.width = width;
      canvas.height = height;
    },

    destroy() {
      device.destroy();
    },
  };

  return renderDevice;
}
