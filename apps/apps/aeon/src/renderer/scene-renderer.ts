import type { RenderDevice } from './wgpu-renderer';
import {
  createSaturnBody, createMarsBody, createPlutoBody, createCeresBody, createEuropaBody, createRing,
  createBodyLOD,
  type Mesh, type BodyLOD,
} from '../utils/geometry';

import starfieldWgsl from '../shaders/starfield.wgsl';
import saturnWgsl from '../shaders/saturn.wgsl';
import ringsWgsl from '../shaders/rings.wgsl';
import bodyWgsl from '../shaders/body.wgsl';
import shadowWgsl from '../shaders/shadow.wgsl';

import { mat4Identity, mat4Perspective, mat4LookAt, mat4Multiply, mat4RotateY } from '../utils/math';

const FLOAT32_SIZE = 4;
const ALIGN = 256;

function align256(size: number): number {
  return Math.ceil(size / ALIGN) * ALIGN;
}

interface GPUMesh {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  indexFormat: 'uint16' | 'uint32';
}

interface BodyPipelines {
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
  shadowBindGroup?: GPUBindGroup;
  uniforms: Float32Array;
  uniformBuf: GPUBuffer;
  bodyIndex: number;
  lods: GPUMesh[];
  activeLod: number;
  rings?: {
    mesh: GPUMesh;
    pipeline: GPURenderPipeline;
    bindGroup: GPUBindGroup;
    uniforms: Float32Array;
    uniformBuf: GPUBuffer;
  };
}

function uploadMesh(mesh: Mesh, gpu: GPUDevice, stride: number, posOff: number, normOff: number, uvOff: number): GPUMesh {
  const count = mesh.positions.length / 3;
  const verts = new Float32Array(count * (stride / FLOAT32_SIZE));
  for (let i = 0; i < count; i++) {
    verts[i * (stride / FLOAT32_SIZE) + posOff / FLOAT32_SIZE] = mesh.positions[i * 3];
    verts[i * (stride / FLOAT32_SIZE) + posOff / FLOAT32_SIZE + 1] = mesh.positions[i * 3 + 1];
    verts[i * (stride / FLOAT32_SIZE) + posOff / FLOAT32_SIZE + 2] = mesh.positions[i * 3 + 2];
    verts[i * (stride / FLOAT32_SIZE) + normOff / FLOAT32_SIZE] = mesh.normals[i * 3];
    verts[i * (stride / FLOAT32_SIZE) + normOff / FLOAT32_SIZE + 1] = mesh.normals[i * 3 + 1];
    verts[i * (stride / FLOAT32_SIZE) + normOff / FLOAT32_SIZE + 2] = mesh.normals[i * 3 + 2];
    if (uvOff >= 0) {
      verts[i * (stride / FLOAT32_SIZE) + uvOff / FLOAT32_SIZE] = mesh.uvs[i * 2];
      verts[i * (stride / FLOAT32_SIZE) + uvOff / FLOAT32_SIZE + 1] = mesh.uvs[i * 2 + 1];
    }
  }

  const vertexBuffer = gpu.createBuffer({
    size: verts.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  gpu.queue.writeBuffer(vertexBuffer, 0, verts.buffer);

  const indexBuffer = gpu.createBuffer({
    size: mesh.indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  gpu.queue.writeBuffer(indexBuffer, 0, mesh.indices as any);

  return { vertexBuffer, indexBuffer, indexCount: mesh.indices.length, indexFormat: mesh.indices instanceof Uint16Array ? 'uint16' : 'uint32' };
}

const SHADOW_SIZES = [1024, 2048];

// Body uniforms struct (16+16+16+1+1+1+1+1+16 = 69 floats)
const BODY_UNIFORM_FLOATS = 69;
const BODY_UNIFORM_BYTES = align256(BODY_UNIFORM_FLOATS * FLOAT32_SIZE);

// Saturn uniforms struct (16+16+16+1+1+1+1+16 = 68 floats)
const SATURN_UNIFORM_FLOATS = 68;
const SATURN_UNIFORM_BYTES = align256(SATURN_UNIFORM_FLOATS * FLOAT32_SIZE);

// Shadow uniforms (just lightVP = 16 floats)
const SHADOW_UNIFORM_FLOATS = 16;

export interface RenderStats {
  fps: number;
  triangles: number;
  drawCalls: number;
  shadowQuality: number;
  lodBias: number;
}

export class SceneRenderer {
  private device: RenderDevice;
  private time = 0;

  // Performance tracking
  private frameTimes: number[] = [];
  private fps = 60;
  private frameCount = 0;
  private perfTimer = 0;
  shadowQuality = 1;
  lodBias = 0;

  // Starfield
  private starfieldPipeline: GPURenderPipeline | null = null;
  private starfieldBindGroup: GPUBindGroup | null = null;
  private starfieldUniformBuf: GPUBuffer | null = null;
  private starfieldUniforms: Float32Array | null = null;

  // Bodies
  private bodies: Record<string, BodyPipelines> = {};
  private currentBody = 'saturn';

  // Camera
  private projection = mat4Identity() as Float32Array;
  private view = mat4Identity() as Float32Array;
  private modelMatrix = mat4Identity() as Float32Array;
  private eye: [number, number, number] = [0, 16, 42];
  private target: [number, number, number] = [0, 0, 0];

  // State
  sunAngle = 35;
  eclipse = false;
  binary = false;

  // Warp transition
  private transition = { active: false, phase: 'out' as 'out' | 'in', progress: 0, fromBody: '', toBody: '' };
  private restEye: [number, number, number] = [0, 16, 42];

  // Shadow
  private shadowTexture: GPUTexture | null = null;
  private shadowDepthView: GPUTextureView | null = null;
  private shadowSampler: GPUSampler | null = null;
  private shadowPipeline: GPURenderPipeline | null = null;
  private shadowBindGroup: GPUBindGroup | null = null;
  private shadowUniformBuf: GPUBuffer | null = null;
  private shadowUniforms: Float32Array | null = null;

  // Depth texture
  private depthTexture: GPUTexture | null = null;

  constructor(device: RenderDevice) {
    this.device = device;
  }

  async init() {
    if (this.device.backend === 'webgpu') {
      await this.initWebGPU();
    }
  }

  private async initWebGPU(): Promise<void> {
    const gpu = this.device.gpuDevice!;
    const fmt = navigator.gpu.getPreferredCanvasFormat();

    // --- Starfield ---
    {
      const mod = gpu.createShaderModule({ code: starfieldWgsl });
      this.starfieldPipeline = gpu.createRenderPipeline({
        layout: 'auto',
        vertex: { module: mod, entryPoint: 'vs_main' },
        fragment: {
          module: mod, entryPoint: 'fs_main',
          targets: [{
            format: fmt,
            blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } },
          }],
        },
        primitive: { topology: 'triangle-list' },
      });

      const sz = align256(16);
      this.starfieldUniformBuf = gpu.createBuffer({ size: sz, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.starfieldUniforms = new Float32Array(sz / FLOAT32_SIZE);
      this.starfieldBindGroup = gpu.createBindGroup({
        layout: this.starfieldPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.starfieldUniformBuf, offset: 0, size: 4 } },
          { binding: 1, resource: { buffer: this.starfieldUniformBuf, offset: 8, size: 8 } },
        ],
      });
    }

    const vertexLayout8 = { arrayStride: 8 * FLOAT32_SIZE, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' as const },
      { shaderLocation: 1, offset: 3 * FLOAT32_SIZE, format: 'float32x3' as const },
      { shaderLocation: 2, offset: 6 * FLOAT32_SIZE, format: 'float32x2' as const },
    ]};

    const vertexLayout3 = { arrayStride: 8 * FLOAT32_SIZE, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' as const },
    ]};

    // --- Shadow system ---
    {
      this.rebuildShadowTexture(gpu, 1);

      this.shadowSampler = gpu.createSampler({
        compare: 'less',
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });

      const shadowMod = gpu.createShaderModule({ code: shadowWgsl });
      this.shadowPipeline = gpu.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shadowMod, entryPoint: 'vs_main', buffers: [vertexLayout3] },
        primitive: { topology: 'triangle-list' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
      });

      this.shadowUniformBuf = gpu.createBuffer({
        size: align256(SHADOW_UNIFORM_FLOATS * FLOAT32_SIZE),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.shadowUniforms = new Float32Array(SHADOW_UNIFORM_FLOATS);
      this.shadowBindGroup = gpu.createBindGroup({
        layout: this.shadowPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: this.shadowUniformBuf } }],
      });
    }

    // --- Saturn ---
    {
      const saturnLOD = createBodyLOD(createSaturnBody, 10);
      const saturnMod = gpu.createShaderModule({ code: saturnWgsl });
      const saturnPipeline = gpu.createRenderPipeline({
        layout: 'auto',
        vertex: { module: saturnMod, entryPoint: 'vs_main', buffers: [vertexLayout8] },
        fragment: { module: saturnMod, entryPoint: 'fs_main', targets: [{ format: fmt }] },
        primitive: { topology: 'triangle-list' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
      });
      const sBuf = gpu.createBuffer({ size: SATURN_UNIFORM_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const sUniforms = new Float32Array(SATURN_UNIFORM_BYTES / FLOAT32_SIZE);

      const bg1 = gpu.createBindGroup({
        layout: saturnPipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: this.shadowSampler! },
          { binding: 1, resource: this.shadowDepthView! },
        ],
      });
      const saturnBindGroup = gpu.createBindGroup({
        layout: saturnPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: sBuf } }],
      });

      // Rings
      const ringMesh = createRing(14, 29, 256);
      const ringMod = gpu.createShaderModule({ code: ringsWgsl });
      const ringPipeline = gpu.createRenderPipeline({
        layout: 'auto',
        vertex: { module: ringMod, entryPoint: 'vs_main', buffers: [{ arrayStride: 6 * FLOAT32_SIZE, attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' as const },
          { shaderLocation: 1, offset: 3 * FLOAT32_SIZE, format: 'float32x3' as const },
        ]}]},
        fragment: {
          module: ringMod, entryPoint: 'fs_main',
          targets: [{
            format: fmt,
            blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } },
          }],
        },
        primitive: { topology: 'triangle-list' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
      });
      const ringUniformSize = align256(16 * 3 + 4 * 3);
      const ringUBuf = gpu.createBuffer({ size: ringUniformSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const ringUniforms = new Float32Array(ringUniformSize / FLOAT32_SIZE);
      const ringBindGroup = gpu.createBindGroup({
        layout: ringPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: ringUBuf } }],
      });

      this.bodies.saturn = {
        pipeline: saturnPipeline, bindGroup: saturnBindGroup, shadowBindGroup: bg1, uniforms: sUniforms, uniformBuf: sBuf,
        bodyIndex: 0, activeLod: 2,
        lods: [
          uploadMesh(saturnLOD.low, gpu, 8 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, 6 * FLOAT32_SIZE),
          uploadMesh(saturnLOD.medium, gpu, 8 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, 6 * FLOAT32_SIZE),
          uploadMesh(saturnLOD.high, gpu, 8 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, 6 * FLOAT32_SIZE),
        ],
        rings: {
          mesh: uploadMesh(ringMesh, gpu, 6 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, -1),
          pipeline: ringPipeline, bindGroup: ringBindGroup, uniforms: ringUniforms, uniformBuf: ringUBuf,
        },
      };
    }

    // --- Other bodies using body.wgsl ---
    const bodyFuncs: [string, (r: number, d: number) => Mesh, number][] = [
      ['mars', createMarsBody, 0],
      ['pluto', createPlutoBody, 1],
      ['ceres', createCeresBody, 2],
      ['europa', createEuropaBody, 3],
    ];

    const bodyMod = gpu.createShaderModule({ code: bodyWgsl });

    for (const [name, func, idx] of bodyFuncs) {
      const lod = createBodyLOD(func, 10);
      const pipeline = gpu.createRenderPipeline({
        layout: 'auto',
        vertex: { module: bodyMod, entryPoint: 'vs_main', buffers: [vertexLayout8] },
        fragment: { module: bodyMod, entryPoint: 'fs_main', targets: [{ format: fmt }] },
        primitive: { topology: 'triangle-list' },
        depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
      });
      const uBuf = gpu.createBuffer({ size: BODY_UNIFORM_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const uniforms = new Float32Array(BODY_UNIFORM_BYTES / FLOAT32_SIZE);

      const bindGroup = gpu.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uBuf } }],
      });

      const shadowBindGroup = gpu.createBindGroup({
        layout: pipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: this.shadowSampler! },
          { binding: 1, resource: this.shadowDepthView! },
        ],
      });
      this.bodies[name] = {
        pipeline, bindGroup, shadowBindGroup, uniforms, uniformBuf: uBuf,
        bodyIndex: idx, activeLod: 2,
        lods: [
          uploadMesh(lod.low, gpu, 8 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, 6 * FLOAT32_SIZE),
          uploadMesh(lod.medium, gpu, 8 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, 6 * FLOAT32_SIZE),
          uploadMesh(lod.high, gpu, 8 * FLOAT32_SIZE, 0, 3 * FLOAT32_SIZE, 6 * FLOAT32_SIZE),
        ],
      };
    }

    // Depth texture
    this.depthTexture = gpu.createTexture({
      size: [this.device.width, this.device.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private rebuildShadowTexture(gpu: GPUDevice, quality: number) {
    if (this.shadowTexture) this.shadowTexture.destroy();
    const size = SHADOW_SIZES[quality] ?? 1024;
    this.shadowTexture = gpu.createTexture({
      size: [size, size],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.shadowDepthView = this.shadowTexture.createView();
  }

  getStats(): RenderStats {
    return {
      fps: this.fps,
      triangles: this.bodies[this.currentBody]?.lods[this.bodies[this.currentBody].activeLod]?.indexCount ?? 0,
      drawCalls: this.currentBody === 'saturn' ? 3 : 2,
      shadowQuality: this.shadowQuality,
      lodBias: this.lodBias,
    };
  }

  update(dt: number) {
    this.time += dt;

    // Performance tracking
    this.frameTimes.push(dt);
    this.frameCount++;
    this.perfTimer += dt;
    if (this.perfTimer >= 0.5) {
      const recent = this.frameTimes.slice(-60);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      this.fps = avg > 0 ? Math.round(1 / avg) : 60;
      this.perfTimer = 0;

      // Auto-reduce
      const prevSQ = this.shadowQuality;
      if (this.fps < 25 && this.shadowQuality > 0) {
        this.shadowQuality--;
      } else if (this.fps > 45 && this.shadowQuality < 1) {
        this.shadowQuality++;
      }
      if (this.shadowQuality !== prevSQ) {
        this.rebuildShadowTexture(this.device.gpuDevice!, this.shadowQuality);
      }
      if (this.fps < 20 && this.lodBias < 1) {
        this.lodBias++;
      } else if (this.fps > 50 && this.lodBias > 0) {
        this.lodBias--;
      }
    }

    if (this.transition.active) {
      this.transition.progress += dt;

      if (this.transition.phase === 'out') {
        if (this.transition.progress >= 0.25) {
          this.transition.phase = 'in';
          this.transition.progress = 0;
          this.currentBody = this.transition.toBody;
        }
      } else if (this.transition.phase === 'in') {
        if (this.transition.progress >= 0.25) {
          this.transition.active = false;
          this.transition.progress = 1;
        }
      }

      const t = Math.min(this.transition.progress / 0.25, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      if (this.transition.phase === 'out') {
        const zoom = 1 + eased * 5;
        this.eye = [
          this.restEye[0] * zoom,
          this.restEye[1] * zoom,
          this.restEye[2] * zoom,
        ];
      } else {
        const zoom = 1 + (1 - eased) * 5;
        this.eye = [
          this.restEye[0] * zoom,
          this.restEye[1] * zoom,
          this.restEye[2] * zoom,
        ];
      }
    }
  }

  setBody(body: string) {
    if (!this.bodies[body] || body === this.currentBody) return;
    this.transition.active = true;
    this.transition.phase = 'out';
    this.transition.progress = 0;
    this.transition.fromBody = this.currentBody;
    this.transition.toBody = body;
  }

  render(): void {
    if (this.device.backend === 'webgpu') this.renderWebGPU();
  }

  private renderWebGPU(): void {
    const gpu = this.device.gpuDevice!;
    const aspect = this.device.width / this.device.height;
    const fmt = navigator.gpu.getPreferredCanvasFormat();

    this.projection = mat4Perspective(0.7, aspect, 2, 300) as Float32Array;
    this.view = mat4LookAt(this.eye, this.target, [0, 1, 0]) as Float32Array;
    this.modelMatrix = mat4RotateY(mat4Identity() as Float32Array, this.time * 0.05);

    const mvp = mat4Multiply(this.projection, mat4Multiply(this.view, this.modelMatrix as Float32Array));

    // Light view-projection for shadow
    const sunAngle = this.sunAngle * Math.PI / 180;
    const lightDir: [number, number, number] = [Math.cos(sunAngle), Math.sin(sunAngle) * 0.6, 0.4];
    const lightLen = Math.sqrt(lightDir[0]*lightDir[0] + lightDir[1]*lightDir[1] + lightDir[2]*lightDir[2]);
    const lightPos: [number, number, number] = [lightDir[0]/lightLen * 50, lightDir[1]/lightLen * 50, lightDir[2]/lightLen * 50];
    const lightProj = mat4Perspective(0.8, 1, 5, 200) as Float32Array;
    const lightView = mat4LookAt(lightPos, [0, 0, 0], [0, 1, 0]) as Float32Array;
    const lightVP = mat4Multiply(lightProj, lightView) as Float32Array;

    // Ensure depth texture is current size
    if (this.depthTexture &&
        (this.depthTexture.width !== this.device.width || this.depthTexture.height !== this.device.height)) {
      this.depthTexture.destroy();
      this.depthTexture = null;
    }
    if (!this.depthTexture) {
      this.depthTexture = gpu.createTexture({
        size: [this.device.width, this.device.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    const textureView = this.device.gpuContext!.getCurrentTexture().createView();
    const encoder = gpu.createCommandEncoder();

    // --- LOD selection ---
    const dist = Math.sqrt(
      (this.eye[0] - this.target[0]) ** 2 +
      (this.eye[1] - this.target[1]) ** 2 +
      (this.eye[2] - this.target[2]) ** 2
    );
    const base = dist < 18 ? 2 : dist < 35 ? 1 : 0;
    const lod = Math.min(Math.max(base - this.lodBias, 0), 2);

    // --- Shadow depth pass ---
    {
      const bodyPipeline = this.bodies[this.currentBody];
      if (bodyPipeline) {
        bodyPipeline.activeLod = lod;
        const mesh = bodyPipeline.lods[lod];
        const shadowPass = encoder.beginRenderPass({
          colorAttachments: [],
          depthStencilAttachment: {
            view: this.shadowDepthView!,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
          },
        });
        shadowPass.setPipeline(this.shadowPipeline!);
        if (this.shadowUniforms && this.shadowUniformBuf) {
          for (let i = 0; i < 16; i++) this.shadowUniforms[i] = lightVP[i];
          gpu.queue.writeBuffer(this.shadowUniformBuf, 0, this.shadowUniforms as any);
        }
        shadowPass.setBindGroup(0, this.shadowBindGroup!);
        shadowPass.setVertexBuffer(0, mesh.vertexBuffer);
        shadowPass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat);
        shadowPass.drawIndexed(mesh.indexCount);
        shadowPass.end();
      }
    }

    // --- Main body pass ---
    const bodyPipeline = this.bodies[this.currentBody];
    if (bodyPipeline) {
      const mesh = bodyPipeline.lods[lod];
      let uniforms: Float32Array;
      let uniformBuf: GPUBuffer;
      let pipeline: GPURenderPipeline;
      let bindGroup: GPUBindGroup;
      let uniformFloats: number;

      if (this.currentBody === 'saturn') {
        uniforms = bodyPipeline.uniforms;
        uniformBuf = bodyPipeline.uniformBuf;
        pipeline = bodyPipeline.pipeline;
        bindGroup = bodyPipeline.bindGroup;
        uniformFloats = SATURN_UNIFORM_FLOATS;
      } else {
        uniforms = bodyPipeline.uniforms;
        uniformBuf = bodyPipeline.uniformBuf;
        pipeline = bodyPipeline.pipeline;
        bindGroup = bodyPipeline.bindGroup;
        uniformFloats = BODY_UNIFORM_FLOATS;
      }

      // Write body uniforms
      for (let i = 0; i < 16; i++) uniforms[i] = mvp[i];
      for (let i = 0; i < 16; i++) uniforms[16 + i] = this.modelMatrix[i];
      for (let i = 0; i < 16; i++) uniforms[32 + i] = this.modelMatrix[i];
      uniforms[48] = this.time;
      uniforms[49] = sunAngle;
      uniforms[50] = this.eclipse ? 1 : 0;
      uniforms[51] = this.binary ? 1 : 0;
      if (uniformFloats > 52) {
        uniforms[52] = bodyPipeline.bodyIndex;
      }
      const lightVPStart = uniformFloats - 16;
      for (let i = 0; i < 16; i++) uniforms[lightVPStart + i] = lightVP[i];

      gpu.queue.writeBuffer(uniformBuf, 0, uniforms as any);

      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.02, g: 0.024, b: 0.047, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: this.depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      });

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      if (bodyPipeline.shadowBindGroup) pass.setBindGroup(1, bodyPipeline.shadowBindGroup);
      pass.setVertexBuffer(0, mesh.vertexBuffer);
      pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat);
      pass.drawIndexed(mesh.indexCount);
      pass.end();

      // Rings (Saturn only)
      if (bodyPipeline.rings && this.currentBody === 'saturn') {
        const r = bodyPipeline.rings;
        const ringMVP = mat4Multiply(this.projection, this.view) as Float32Array;
        for (let i = 0; i < 16; i++) r.uniforms[i] = ringMVP[i];
        for (let i = 0; i < 16; i++) r.uniforms[16 + i] = this.modelMatrix[i];
        r.uniforms[32] = this.time;
        r.uniforms[33] = 14;
        r.uniforms[34] = 29;
        gpu.queue.writeBuffer(r.uniformBuf, 0, r.uniforms as any);

        const rpass = encoder.beginRenderPass({
          colorAttachments: [{ view: textureView, loadOp: 'load', storeOp: 'store' }],
          depthStencilAttachment: { view: this.depthTexture.createView(), depthLoadOp: 'load', depthStoreOp: 'store' },
        });
        rpass.setPipeline(r.pipeline);
        rpass.setBindGroup(0, r.bindGroup);
        rpass.setVertexBuffer(0, r.mesh.vertexBuffer);
        rpass.setIndexBuffer(r.mesh.indexBuffer, r.mesh.indexFormat);
        rpass.drawIndexed(r.mesh.indexCount);
        rpass.end();
      }
    }

    // --- Starfield pass ---
    {
      if (this.starfieldUniforms && this.starfieldUniformBuf) {
        this.starfieldUniforms[0] = this.time;
        this.starfieldUniforms[2] = this.device.width;
        this.starfieldUniforms[3] = this.device.height;
        gpu.queue.writeBuffer(this.starfieldUniformBuf, 0, this.starfieldUniforms as any);
      }

      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: textureView, loadOp: 'load', storeOp: 'store' }],
      });
      pass.setPipeline(this.starfieldPipeline!);
      pass.setBindGroup(0, this.starfieldBindGroup!);
      pass.draw(3);
      pass.end();
    }

    gpu.queue.submit([encoder.finish()]);
  }

  destroy() {
    this.shadowTexture?.destroy();
    this.depthTexture?.destroy();
    this.shadowUniformBuf?.destroy();
    this.starfieldUniformBuf?.destroy();

    for (const body of Object.values(this.bodies)) {
      body.uniformBuf?.destroy();
      for (const mesh of body.lods) {
        mesh.vertexBuffer.destroy();
        mesh.indexBuffer.destroy();
      }
      if (body.rings) {
        body.rings.mesh.vertexBuffer.destroy();
        body.rings.mesh.indexBuffer.destroy();
        body.rings.uniformBuf?.destroy();
      }
    }
  }

  resize() {
    // Depth texture rebuilt next frame
  }
}
