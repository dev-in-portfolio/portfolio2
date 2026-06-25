export interface RenderDevice {
  backend: 'webgpu' | 'webgl2';
  width: number;
  height: number;
  gpuDevice?: GPUDevice;
  gpuContext?: GPUCanvasContext;
  resize: (w: number, h: number) => void;
}

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<RenderDevice> {
  if (!navigator.gpu) throw new Error('WebGPU not supported');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  device.lost.then(info => console.error('WebGPU device lost:', info.message));
  device.addEventListener('uncapturederror', (event) => {
    console.error('WebGPU uncaptured error:', event.error.message);
  });
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  if (!context) throw new Error('WebGPU context unavailable');
  const fmt = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format: fmt, alphaMode: 'opaque' });

  const rect = canvas.parentElement?.getBoundingClientRect() ?? { width: 640, height: 480 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(320, Math.floor(rect.width));
  const H = Math.max(320, Math.floor(rect.height));
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);

  const resize = (w: number, h: number) => {
    const dpr2 = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr2);
    canvas.height = Math.floor(h * dpr2);
  };

  return { backend: 'webgpu', width: canvas.width, height: canvas.height, gpuDevice: device, gpuContext: context, resize };
}
