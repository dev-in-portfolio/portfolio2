import type { RenderDevice } from './wgpu-renderer';
import vertSrc from '../shaders/magma.vert.wgsl';
import fragSrc from '../shaders/magma.frag.wgsl';

export class MagmaRenderer {
  private device: GPUDevice;
  private pipeline: GPURenderPipeline;
  private quadBuffer: GPUBuffer;
  private bindGroup: GPUBindGroup;
  private uniformBuffer: GPUBuffer;
  private time = 0;
  private seed = 42.0;

  constructor(private renderer: RenderDevice) {
    const d = renderer.gpuDevice;
    if (!d) throw new Error('WebGPU device required');
    this.device = d;
    this.quadBuffer = this.createQuad();
    this.uniformBuffer = this.createUniforms();
    this.pipeline = this.createPipeline();
    this.bindGroup = this.createBindGroup();
  }

  private createQuad(): GPUBuffer {
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = this.device.createBuffer({
      size: verts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(buf, 0, verts);
    return buf;
  }

  private createUniforms(): GPUBuffer {
    const buf = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    return buf;
  }

  private createPipeline(): GPURenderPipeline {
    const vertMod = this.device.createShaderModule({ code: vertSrc });
    const fragMod = this.device.createShaderModule({ code: fragSrc });

    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertMod,
        entryPoint: 'main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: fragMod,
        entryPoint: 'main',
        targets: [{ format: this.renderer.gpuContext!.getCurrentTexture().format }],
      },
      primitive: { topology: 'triangle-strip' },
    });
  }

  private createBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer, offset: 0, size: 4 } },
        { binding: 1, resource: { buffer: this.uniformBuffer, offset: 4, size: 4 } },
      ],
    });
  }

  update(dt: number) {
    this.time += dt;
    const data = new Float32Array([this.time, this.seed]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
  }

  render() {
    const ctx = this.renderer.gpuContext!;
    const textureView = ctx.getCurrentTexture().createView();

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.quadBuffer);
    pass.draw(4);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  destroy() {
    this.quadBuffer.destroy();
    this.uniformBuffer.destroy();
  }
}
