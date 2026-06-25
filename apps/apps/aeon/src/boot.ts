import { initWebGPU, type RenderDevice } from './renderer/wgpu-renderer';
import { createWebGL2Device } from './renderer/webgl2-renderer';

export interface AEONState {
  body: 'saturn' | 'pluto' | 'mars' | 'ceres' | 'europa';
  sunAngle: number;
  presentation: boolean;
  eclipse: boolean;
  grade: 'cinematic' | 'deep' | 'analog';
  binary: boolean;
  scanning: boolean;
}

export interface BootResult {
  device: RenderDevice;
  state: AEONState;
  log: (msg: string) => void;
}

export async function boot(canvas: HTMLCanvasElement): Promise<BootResult> {
  let device: RenderDevice | null = null;

  try {
    device = await initWebGPU(canvas);
    console.log('[AEON] WebGPU initialized');
  } catch (e) {
    console.warn('[AEON] WebGPU unavailable, falling back to WebGL2:', e);
    device = createWebGL2Device(canvas);
  }

  if (!device) {
    throw new Error('No rendering backend available (WebGPU nor WebGL2)');
  }

  const state: AEONState = {
    body: 'saturn',
    sunAngle: 35,
    presentation: false,
    eclipse: false,
    grade: 'cinematic',
    binary: false,
    scanning: false,
  };

  const logEl = document.getElementById('opsLog');
  const log = (msg: string) => {
    if (!logEl) return;
    const entry = document.createElement('div');
    entry.className = 'ops-log-entry';
    entry.innerHTML = `<span class="ts">T+${(performance.now() / 1000).toFixed(2)}</span><span class="msg">${msg}</span>`;
    logEl.appendChild(entry);
    while (logEl.childNodes.length > 20) logEl.removeChild(logEl.firstChild!);
    logEl.scrollTop = logEl.scrollHeight;
  };

  log(`Backend: ${device.backend.toUpperCase()}`);
  log('System initialized. Warp drive ready.');

  return { device, state, log };
}
