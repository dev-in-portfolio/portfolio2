import { initWebGPU } from './renderer/wgpu-renderer';
import { GlobeRenderer } from './renderer/globe-renderer';

function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }

async function main() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%'; canvas.style.height = '100%';
  container.appendChild(canvas);

  const device = await initWebGPU(canvas);
  const globe = new GlobeRenderer(device);
  await globe.init();

  const obs = new ResizeObserver((entries) => {
    for (const e of entries) {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) { device.resize(width, height); globe.resize(); }
    }
  });
  obs.observe(container);

  // Controls
  const ctlActivity = document.getElementById('ctlActivity') as HTMLInputElement;
  const ctlMag = document.getElementById('ctlMag') as HTMLInputElement;
  const ctlSpin = document.getElementById('ctlSpin') as HTMLInputElement;
  const ctlDepth = document.getElementById('ctlDepth') as HTMLInputElement;
  const valActivity = document.getElementById('valActivity');
  const valMag = document.getElementById('valMag');
  const valSpin = document.getElementById('valSpin');
  const valDepth = document.getElementById('valDepth');
  const tkMag = document.getElementById('tkMag');
  const tkAct = document.getElementById('tkAct');
  const tkSpin = document.getElementById('tkSpin');
  const hudA = document.getElementById('hudA');
  const hudM = document.getElementById('hudM');
  const hudS = document.getElementById('hudS');
  const hudD = document.getElementById('hudD');
  const miniChart = document.getElementById('miniChart') as HTMLCanvasElement;
  const ctx = miniChart?.getContext('2d');
  const feedEl = document.getElementById('quakeFeed');
  const feedNote = document.getElementById('feedNote');

  function syncUI() {
    if (valActivity) valActivity.textContent = globe.activity.toFixed(2);
    if (valMag) valMag.textContent = globe.magnitude.toFixed(1);
    if (valSpin) valSpin.textContent = globe.spin.toFixed(2);
    if (valDepth) valDepth.textContent = globe.depthBias.toFixed(2);
    if (tkMag) tkMag.textContent = 'M' + globe.magnitude.toFixed(1);
    if (tkAct) tkAct.textContent = globe.activity.toFixed(2);
    if (tkSpin) tkSpin.textContent = globe.spin.toFixed(2);
    if (hudA) hudA.textContent = globe.activity.toFixed(2);
    if (hudM) hudM.textContent = globe.magnitude.toFixed(1);
    if (hudS) hudS.textContent = globe.spin.toFixed(2);
    if (hudD) hudD.textContent = globe.depthBias.toFixed(2);
  }

  if (ctlActivity) {
    globe.activity = parseFloat(ctlActivity.value);
    ctlActivity.addEventListener('input', () => { globe.activity = parseFloat(ctlActivity.value); syncUI(); });
  }
  if (ctlMag) {
    ctlMag.addEventListener('input', () => { globe.magnitude = parseFloat(ctlMag.value); syncUI(); });
  }
  if (ctlSpin) {
    ctlSpin.addEventListener('input', () => { globe.spin = parseFloat(ctlSpin.value); syncUI(); });
  }
  if (ctlDepth) {
    ctlDepth.addEventListener('input', () => { globe.depthBias = parseFloat(ctlDepth.value); syncUI(); });
  }

  // Pointer controls: drag to rotate, vertical drag for activity, pinch for magnitude
  const pts = new Map<number, { x: number; y: number }>();
  let lastRot = 0, lastAct = 0, lastMag = 0, lastDist = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      lastRot = globe.rotOff;
      lastAct = globe.activity;
    } else if (pts.size === 2) {
      const arr = [...pts.values()];
      lastDist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      lastMag = globe.magnitude;
    }
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);

    if (pts.size === 1) {
      const dx = (cur.x - prev.x);
      const dy = (cur.y - prev.y);
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      globe.rotOff = lastRot + (dx / w) * Math.PI * 2;
      globe.activity = clamp(lastAct + (-dy / h) * 0.9, 0, 1);
      if (ctlActivity) ctlActivity.value = String(globe.activity);
      syncUI();
    } else if (pts.size === 2) {
      const arr = [...pts.values()];
      const dist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      const ratio = dist / Math.max(20, lastDist);
      globe.magnitude = clamp(lastMag * (1.0 + (ratio - 1.0) * 0.9), 3.0, 9.5);
      if (ctlMag) ctlMag.value = String(globe.magnitude);
      syncUI();
    }
  }, { passive: true });

  function endPointer(e: PointerEvent) {
    pts.delete(e.pointerId);
    if (pts.size < 2) { lastDist = 0; }
  }
  canvas.addEventListener('pointerup', endPointer, { passive: true });
  canvas.addEventListener('pointercancel', endPointer, { passive: true });

  // Mini chart
  const history: number[] = [];
  function updateChart() {
    if (!ctx || !miniChart) return;
    const w = miniChart.width, h = miniChart.height;
    ctx.clearRect(0, 0, w, h);
    if (history.length < 2) return;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = (i / 59) * w;
      const y = h - history[i] * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Quake feed (USGS)
  if (feedEl && feedNote) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { signal: controller.signal })
      .then(r => { clearTimeout(timeout); return r.json(); })
      .then(data => {
        feedNote!.textContent = `${data.features.length} events in 24h`;
        feedEl!.innerHTML = data.features.slice(0, 10).map((f: any) => {
          const mag = f.properties.mag.toFixed(1);
          const place = f.properties.place || 'Unknown';
          return `<div>M${mag} — ${place}</div>`;
        }).join('');
      })
      .catch(() => { feedNote!.textContent = 'USGS feed unavailable'; });
  }

  // Loop
  let lastTime = performance.now();
  syncUI();

  function frame(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    globe.update(dt);
    globe.render();

    // Chart
    const v = clamp(0.25 + 0.65 * globe.activity + 0.15 * Math.sin(now * 0.001) + 0.06 * (Math.random() - 0.5), 0, 1);
    history.push(v);
    if (history.length > 60) history.shift();
    if (Math.floor(performance.now() / 500) !== Math.floor((performance.now() - 16) / 500)) updateChart();

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
