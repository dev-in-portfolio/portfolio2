import { initWebGPU } from './renderer/wgpu-renderer';
import { SunRenderer } from './renderer/sun-renderer';

function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

async function main() {
  const container = document.getElementById('canvas-container');
  if (!container) { console.error('canvas-container not found'); return; }

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  let device = await initWebGPU(canvas);
  const sun = new SunRenderer(device);
  await sun.init();

  // --- Resize ---
  const obs = new ResizeObserver((entries) => {
    for (const e of entries) {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) {
        device.resize(width, height);
        sun.resize();
      }
    }
  });
  obs.observe(container);

  // --- Controls ---
  const ctlIntensity = document.getElementById('ctlIntensity') as HTMLInputElement;
  const ctlZoom = document.getElementById('ctlZoom') as HTMLInputElement;
  const ctlBoost = document.getElementById('ctlBoost') as HTMLInputElement;
  const valIntensity = document.getElementById('valIntensity');
  const valZoom = document.getElementById('valZoom');
  const valBoost = document.getElementById('valBoost');
  const btnErupt = document.getElementById('btnErupt');
  const btnBoostToggle = document.getElementById('btnBoostToggle');
  const modeText = document.getElementById('modeText');
  const intensityText = document.getElementById('intensityText');
  const hotText = document.getElementById('hotText');

  const tKp = document.getElementById('tKp');
  const tWind = document.getElementById('tWind');
  const tDensity = document.getElementById('tDensity');
  const tBz = document.getElementById('tBz');
  const tXray = document.getElementById('tXray');
  const tRisk = document.getElementById('tRisk');

  if (ctlIntensity) {
    sun.intensity = parseFloat(ctlIntensity.value);
    ctlIntensity.addEventListener('input', () => {
      sun.intensity = parseFloat(ctlIntensity.value);
      if (valIntensity) valIntensity.textContent = sun.intensity.toFixed(2);
      updateTelemetry();
    });
  }

  if (ctlZoom) {
    ctlZoom.addEventListener('input', () => {
      sun.zoom = parseFloat(ctlZoom.value);
      if (valZoom) valZoom.textContent = sun.zoom.toFixed(2);
    });
  }

  if (ctlBoost) {
    ctlBoost.addEventListener('input', () => {
      sun.boost = parseFloat(ctlBoost.value);
      if (valBoost) valBoost.textContent = sun.boost.toFixed(1);
    });
  }

  // --- Phase system (auto-animation) ---
  let phase = 'calm';
  let phaseT = 0;
  let nextEventIn = 4.8 + Math.random() * 3.0;
  let hotSel = 0;

  function rotateHot() {
    hotSel = (hotSel + 1) % 3;
    sun.hotSel = hotSel;
    if (hotText) hotText.textContent = hotSel === 0 ? 'Hot A' : hotSel === 1 ? 'Hot B' : 'Hot C';
  }

  // --- Camera inertia ---
  let targetYaw = sun.yaw, targetPitch = sun.pitch;
  let targetZoom = sun.zoom;
  let vyaw = 0, vpitch = 0, vzoom = 0;

  // Pointer handling
  const pts = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0, pinchStartZoom = targetZoom;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pts.size === 2) {
      const arr = [...pts.values()];
      pinchStartDist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      pinchStartZoom = targetZoom;
    }
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);

    if (pts.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const s = 0.006;
      targetYaw += dx * s;
      targetPitch += dy * s;
      targetPitch = clamp(targetPitch, -0.85, 0.85);
      vyaw = dx * s * 12;
      vpitch = dy * s * 12;
      return;
    }

    if (pts.size === 2) {
      const arr = [...pts.values()];
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      if (pinchStartDist > 0) {
        const scale = pinchStartDist / Math.max(1.0, d);
        targetZoom = clamp(pinchStartZoom + (scale - 1.0) * 0.85, 0.0, 1.0);
        vzoom = (targetZoom - sun.zoom) * 10;
      }
    }
  }, { passive: true });

  function endPointer(e: PointerEvent) {
    pts.delete(e.pointerId);
    if (pts.size < 2) { pinchStartDist = 0; }
  }
  canvas.addEventListener('pointerup', endPointer, { passive: true });
  canvas.addEventListener('pointercancel', endPointer, { passive: true });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dz = Math.sign(e.deltaY) * 0.06;
    targetZoom = clamp(targetZoom + dz, 0.0, 1.0);
    vzoom = dz * 10;
  }, { passive: false });

  // --- Erupt button ---
  if (btnErupt) {
    btnErupt.addEventListener('click', () => {
      phase = 'ramp';
      nextEventIn = 5.5 + Math.random() * 3.0;
      sun.erupt = 1.0;
      rotateHot();
    });
  }

  if (btnBoostToggle) {
    btnBoostToggle.addEventListener('click', () => {
      sun.boost = sun.boost > 1.5 ? 1.0 : 3.0;
      if (ctlBoost) ctlBoost.value = String(sun.boost);
      if (valBoost) valBoost.textContent = sun.boost.toFixed(1);
    });
  }

  // --- Telemetry proxy ---
  function proxyValues() {
    return {
      kp: 2.0 + sun.intensity * 5.8,
      wind: 360 + sun.intensity * 180 + (sun.boost - 1) * 70,
      density: 4 + sun.intensity * 8,
      bz: -1.0 - sun.intensity * 6,
      xray: Math.pow(10, -7 + sun.intensity * 2),
    };
  }

  function stormRisk(kp: number, bz: number, wind: number) {
    const bzFactor = clamp((-bz) / 10, 0, 1);
    const windFactor = clamp((wind - 300) / 500, 0, 1);
    const kpFactor = clamp(kp / 9, 0, 1);
    return clamp(0.12 + 0.48 * bzFactor + 0.25 * windFactor + 0.15 * kpFactor, 0, 1);
  }

  function updateTelemetry() {
    const p = proxyValues();
    if (tKp) tKp.textContent = p.kp.toFixed(1);
    if (tWind) tWind.textContent = p.wind.toFixed(0);
    if (tDensity) tDensity.textContent = p.density.toFixed(1);
    if (tBz) tBz.textContent = p.bz.toFixed(1);
    if (tXray) tXray.textContent = p.xray.toExponential(2);
    if (tRisk) tRisk.textContent = Math.round(stormRisk(p.kp, p.bz, p.wind) * 100) + '%';
  }

  updateTelemetry();

  // --- UFO easter egg ---
  let nextUfoIn = 6.5 + Math.random() * 8.0;

  // --- Loop ---
  let lastTime = performance.now();

  function frame(now: number) {
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = clamp(rawDt, 0, 0.05);

    sun.time += dt * sun.boost;

    // Phase system
    phaseT += dt;
    if (phase === 'calm') {
      sun.intensity = lerp(sun.intensity, 0.22, 0.04);
      nextEventIn -= dt;
      if (nextEventIn <= 0) {
        phase = 'ramp';
        nextEventIn = 5.2 + Math.random() * 3.3;
        sun.erupt = 1.0;
        rotateHot();
      }
      if (modeText) modeText.textContent = 'Charged calm';
    } else if (phase === 'ramp') {
      sun.intensity = lerp(sun.intensity, 0.58, 0.10);
      if (phaseT > 0.9 + Math.random() * 0.6) phase = 'erupt';
      if (modeText) modeText.textContent = 'Magnetic ramp';
    } else if (phase === 'erupt') {
      sun.intensity = lerp(sun.intensity, 0.96, 0.18);
      if (phaseT > 1.2 + Math.random() * 1.0) phase = 'cool';
      if (modeText) modeText.textContent = 'Cinematic eruption';
    } else if (phase === 'cool') {
      sun.intensity = lerp(sun.intensity, 0.30, 0.08);
      if (phaseT > 1.6 + Math.random() * 1.0) phase = 'calm';
      if (modeText) modeText.textContent = 'Afterglow';
    }
    sun.intensity = clamp(sun.intensity, 0.15, 1.0);
    if (intensityText) intensityText.textContent = 'Intensity ' + sun.intensity.toFixed(2);
    sun.erupt = Math.max(0, sun.erupt - dt * (phase === 'erupt' ? 0.30 : 0.75));
    if (ctlIntensity) ctlIntensity.value = String(sun.intensity);

    // Camera damping
    const damp = 1.0 - Math.pow(0.001, dt);
    targetYaw += vyaw * dt;
    targetPitch += vpitch * dt;
    targetZoom = clamp(targetZoom + vzoom * dt, 0, 1);
    vyaw *= (1 - 6 * dt);
    vpitch *= (1 - 6 * dt);
    vzoom *= (1 - 8 * dt);

    sun.yaw = lerp(sun.yaw, targetYaw, damp * 0.35);
    sun.pitch = lerp(sun.pitch, targetPitch, damp * 0.35);
    sun.zoom = lerp(sun.zoom, targetZoom, damp * 0.35);

    if (ctlZoom) ctlZoom.value = String(sun.zoom);

    // UFO timer
    nextUfoIn -= dt;
    if (nextUfoIn <= 0) {
      sun.ufoT0 = sun.time;
      sun.ufoY = (Math.random() * 2 - 1);
      sun.ufoDir = (Math.random() < 0.5) ? -1 : 1;
      nextUfoIn = 6.5 + Math.random() * 10.5;
    }

    sun.update(dt);
    sun.render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  main().catch(err => {
    console.error(err);
    document.body.innerHTML = `<div style="color:#fff;padding:20px;font-family:sans-serif">WebGPU error: ${err instanceof Error ? err.message : String(err)}</div>`;
  });
});
