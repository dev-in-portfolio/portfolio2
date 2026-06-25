import type { RenderDevice } from './wgpu-renderer';
import sunWgsl from '../shaders/sun.wgsl';

const FLOAT32_SIZE = 4;
const ALIGN = 256;

function align256(size: number): number {
  return Math.ceil(size / ALIGN) * ALIGN;
}

export class SunRenderer {
  private device: RenderDevice;
  private pipeline: GPURenderPipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private uniformBuf: GPUBuffer | null = null;
  private uniforms: Float32Array | null = null;

  time = 0;
  intensity = 0.22;
  zoom = 0.45;
  boost = 1.0;
  erupt = 0.0;
  hotSel = 0;
  yaw = -0.35;
  pitch = 0.22;
  panX = 0;
  panY = 0;
  ufoT0 = -9999;
  ufoY = 0;
  ufoDir = 1;

  constructor(device: RenderDevice) {
    this.device = device;
  }

  async init() {
    if (this.device.backend === 'webgpu') {
      await this.initWebGPU();
    }
  }

  private async initWebGPU() {
    const gpu = this.device.gpuDevice;
    if (!gpu) throw new Error('WebGPU device not available');
    const fmt = navigator.gpu.getPreferredCanvasFormat();

    const mod = gpu.createShaderModule({ code: sunWgsl });

    this.pipeline = gpu.createRenderPipeline({
      layout: 'auto',
      vertex: { module: mod, entryPoint: 'vs_main' },
      fragment: { module: mod, entryPoint: 'fs_main', targets: [{ format: fmt }] },
      primitive: { topology: 'triangle-list' },
    });

    const uniformSize = align256(14 * FLOAT32_SIZE);
    this.uniformBuf = gpu.createBuffer({ size: uniformSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.uniforms = new Float32Array(uniformSize / FLOAT32_SIZE);

    this.bindGroup = gpu.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuf } }],
    });
  }

  update(dt: number) {
    this.time += dt;
  }

  render() {
    if (this.device.backend === 'webgpu') this.renderWebGPU();
  }

  private renderWebGPU() {
    const gpu = this.device.gpuDevice;
    if (!gpu) throw new Error('WebGPU device not available');
    const fmt = navigator.gpu.getPreferredCanvasFormat();

    if (!this.pipeline || !this.bindGroup || !this.uniformBuf || !this.uniforms) return;

    this.uniforms[0] = this.device.width;
    this.uniforms[1] = this.device.height;
    this.uniforms[2] = this.time;
    this.uniforms[3] = this.intensity;
    this.uniforms[4] = this.zoom;
    this.uniforms[5] = this.boost;
    this.uniforms[6] = this.erupt;
    this.uniforms[7] = this.hotSel;
    this.uniforms[8] = this.yaw;
    this.uniforms[9] = this.pitch;
    this.uniforms[10] = this.panX;
    this.uniforms[11] = this.panY;
    this.uniforms[12] = this.ufoT0;
    this.uniforms[13] = this.ufoY;
    this.uniforms[14] = this.ufoDir;

    gpu.queue.writeBuffer(this.uniformBuf, 0, this.uniforms as any);

    const textureView = (this.device as any).gpuContext.getCurrentTexture().createView();
    const encoder = gpu.createCommandEncoder();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();

    gpu.queue.submit([encoder.finish()]);
  }

  resize() {}
}
