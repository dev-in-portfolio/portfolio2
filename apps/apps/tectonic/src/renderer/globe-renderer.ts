import type { RenderDevice } from './wgpu-renderer';
import globeWgsl from '../shaders/globe.wgsl?raw';

const ALIGN = 256;
function align256(size: number): number { return Math.ceil(size / ALIGN) * ALIGN; }

export class GlobeRenderer {
  private device: RenderDevice;
  private pipeline: GPURenderPipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private uniformBuf: GPUBuffer | null = null;
  private uniforms: Float32Array | null = null;

  time = 0;
  activity = 0.55;
  magnitude = 5.8;
  spin = 0.40;
  depthBias = 0.35;
  rotOff = 0;

  constructor(device: RenderDevice) { this.device = device; }

  async init() {
    if (this.device.backend === 'webgpu') await this.initWebGPU();
  }

  private async initWebGPU() {
    const gpu = this.device.gpuDevice;
    if (!gpu) throw new Error('GPU device not available');
    const fmt = navigator.gpu.getPreferredCanvasFormat();
    const mod = gpu.createShaderModule({ code: globeWgsl });
    this.pipeline = gpu.createRenderPipeline({
      layout: 'auto',
      vertex: { module: mod, entryPoint: 'vs_main' },
      fragment: { module: mod, entryPoint: 'fs_main', targets: [{ format: fmt }] },
      primitive: { topology: 'triangle-list' },
    });
    const uniformSize = align256(7 * 4);
    this.uniformBuf = gpu.createBuffer({ size: uniformSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.uniforms = new Float32Array(uniformSize / 4);
    this.bindGroup = gpu.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuf } }],
    });
  }

  update(dt: number) { this.time += dt; }

  render() {
    if (this.device.backend === 'webgpu') this.renderWebGPU();
  }

  private renderWebGPU() {
    const gpu = this.device.gpuDevice;
    if (!gpu) throw new Error('GPU device not available');
    if (!this.pipeline || !this.bindGroup || !this.uniformBuf || !this.uniforms) return;

    this.uniforms[0] = this.device.width;
    this.uniforms[1] = this.device.height;
    this.uniforms[2] = this.time;
    this.uniforms[3] = this.activity;
    this.uniforms[4] = this.magnitude;
    this.uniforms[5] = this.spin;
    this.uniforms[6] = this.depthBias;
    this.uniforms[7] = this.rotOff;

    gpu.queue.writeBuffer(this.uniformBuf, 0, this.uniforms as any);

    const ctx = this.device.gpuContext;
    if (!ctx) throw new Error('GPU context not configured');
    const textureView = ctx.getCurrentTexture().createView();
    const encoder = gpu.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: textureView, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
    gpu.queue.submit([encoder.finish()]);
  }

  resize() {}
}
