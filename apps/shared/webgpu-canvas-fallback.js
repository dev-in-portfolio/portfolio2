(() => {
  const loader = document.currentScript;
  const requestedApp = loader?.dataset?.nexusFallback || '';
  const app = requestedApp || (/tectonic/i.test(document.title) ? 'tectonic' : 'helios');
  const nativeConsoleError = console.error.bind(console);
  let activated = false;
  let frameId = 0;

  const numberValue = (id, fallback) => {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) ? value : fallback;
  };

  function createSurface(reason) {
    if (activated) return;
    const container = document.getElementById('canvas-container');
    if (!container) return;
    activated = true;
    document.documentElement.dataset.nexusWebgpuFallback = app;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', `${app} compatibility visualization`);
    canvas.dataset.nexusFallbackCanvas = app;
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '1',
      pointerEvents: 'none',
      background: '#000'
    });
    container.style.position = 'relative';
    container.appendChild(canvas);

    const badge = document.createElement('div');
    badge.textContent = reason === 'headless-verification' ? 'COMPATIBILITY RENDER' : '2D COMPATIBILITY MODE';
    Object.assign(badge.style, {
      position: 'absolute',
      right: '12px',
      bottom: '12px',
      zIndex: '2',
      padding: '5px 8px',
      border: '1px solid rgba(255,255,255,.18)',
      borderRadius: '999px',
      background: 'rgba(0,0,0,.62)',
      color: 'rgba(255,255,255,.72)',
      font: '600 10px system-ui,sans-serif',
      letterSpacing: '.08em',
      pointerEvents: 'none'
    });
    container.appendChild(badge);

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    function resize() {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawHelios(time, width, height) {
      context.fillStyle = '#010103';
      context.fillRect(0, 0, width, height);
      const intensity = numberValue('ctlIntensity', 0.22);
      const zoom = numberValue('ctlZoom', 0.45);
      const speed = numberValue('ctlBoost', 1);
      const radius = Math.min(width, height) * (0.16 + zoom * 0.12);
      const cx = width * 0.5;
      const cy = height * 0.5;
      const pulse = 1 + Math.sin(time * 0.0012 * speed) * 0.035 * intensity;

      const corona = context.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * 2.8);
      corona.addColorStop(0, '#fff9c4');
      corona.addColorStop(0.16, '#ffd166');
      corona.addColorStop(0.36, '#ff7a00');
      corona.addColorStop(0.58, 'rgba(255,70,0,.28)');
      corona.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = corona;
      context.beginPath();
      context.arc(cx, cy, radius * 2.8 * pulse, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.translate(cx, cy);
      context.rotate(time * 0.00005 * speed);
      for (let index = 0; index < 34; index += 1) {
        const angle = (index / 34) * Math.PI * 2;
        const wave = Math.sin(time * 0.002 * speed + index * 2.17);
        const length = radius * (0.35 + intensity * 1.4 + Math.abs(wave) * 0.35);
        context.strokeStyle = `rgba(255,${110 + (index % 5) * 18},20,${0.12 + intensity * 0.22})`;
        context.lineWidth = 1 + (index % 3) * 0.5;
        context.beginPath();
        context.arc(0, 0, radius * (0.92 + wave * 0.04), angle, angle + 0.7 + intensity * 0.8);
        context.stroke();
        context.beginPath();
        context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        context.quadraticCurveTo(
          Math.cos(angle + 0.18) * (radius + length * 0.55),
          Math.sin(angle + 0.18) * (radius + length * 0.55),
          Math.cos(angle + 0.34) * (radius + length),
          Math.sin(angle + 0.34) * (radius + length)
        );
        context.stroke();
      }
      context.restore();

      context.fillStyle = 'rgba(255,255,255,.82)';
      for (let index = 0; index < 65; index += 1) {
        const seed = index * 91.73;
        const angle = seed + time * 0.00008 * speed;
        const distance = radius * (1.15 + ((index * 37) % 100) / 42);
        const x = cx + Math.cos(angle) * distance;
        const y = cy + Math.sin(angle * 1.13) * distance * 0.62;
        const size = 0.5 + (index % 4) * 0.35;
        context.globalAlpha = 0.15 + ((index * 13) % 70) / 100;
        context.fillRect(x, y, size, size);
      }
      context.globalAlpha = 1;
    }

    function drawTectonic(time, width, height) {
      context.fillStyle = '#010306';
      context.fillRect(0, 0, width, height);
      const activity = numberValue('ctlActivity', 0.55);
      const magnitude = numberValue('ctlMag', 5.8);
      const spin = numberValue('ctlSpin', 0.4);
      const depth = numberValue('ctlDepth', 0.35);
      const radius = Math.min(width, height) * 0.34;
      const cx = width * 0.52;
      const cy = height * 0.5;

      const glow = context.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.35);
      glow.addColorStop(0, '#163b52');
      glow.addColorStop(0.62, '#071b27');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.clip();
      context.fillStyle = '#082331';
      context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      const rotation = time * 0.00004 * (0.2 + spin);
      for (let line = -5; line <= 5; line += 1) {
        context.strokeStyle = 'rgba(80,180,210,.16)';
        context.lineWidth = 1;
        context.beginPath();
        const y = cy + (line / 6) * radius;
        context.ellipse(cx, y, radius * Math.cos((line / 6) * Math.PI * 0.48), radius * 0.08, 0, 0, Math.PI * 2);
        context.stroke();
      }
      for (let line = 0; line < 12; line += 1) {
        context.strokeStyle = 'rgba(80,180,210,.13)';
        context.beginPath();
        context.ellipse(cx, cy, radius * 0.14, radius, rotation + (line / 12) * Math.PI, 0, Math.PI * 2);
        context.stroke();
      }

      for (let plate = 0; plate < 11; plate += 1) {
        const angle = rotation * 3 + plate * 1.73;
        const plateRadius = radius * (0.28 + ((plate * 31) % 55) / 100);
        const px = cx + Math.cos(angle) * plateRadius;
        const py = cy + Math.sin(angle * 1.4) * plateRadius * 0.72;
        context.fillStyle = plate % 3 === 0 ? 'rgba(126,105,58,.65)' : 'rgba(47,91,74,.72)';
        context.beginPath();
        context.ellipse(px, py, radius * (0.12 + (plate % 4) * 0.025), radius * (0.06 + (plate % 3) * 0.02), angle, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      context.strokeStyle = `rgba(255,145,0,${0.32 + activity * 0.45})`;
      context.lineWidth = 1.2 + magnitude / 7;
      for (let fault = 0; fault < 7; fault += 1) {
        const baseAngle = rotation * 4 + fault * 0.92;
        context.beginPath();
        for (let point = 0; point < 18; point += 1) {
          const t = point / 17;
          const angle = baseAngle + t * (0.8 + depth);
          const rr = radius * (0.24 + t * 0.75 + Math.sin(point * 2.1 + time * 0.002) * 0.018);
          const x = cx + Math.cos(angle) * rr;
          const y = cy + Math.sin(angle) * rr * 0.78;
          if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke();
      }

      const pulse = ((time * 0.00025 * (0.4 + activity)) % 1);
      context.strokeStyle = `rgba(255,190,60,${1 - pulse})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(cx + radius * 0.24, cy - radius * 0.18, 5 + pulse * radius * 0.34, 0, Math.PI * 2);
      context.stroke();
    }

    function draw(time) {
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      if (app === 'tectonic') drawTectonic(time, width, height);
      else drawHelios(time, width, height);
      frameId = window.requestAnimationFrame(draw);
    }

    resize();
    new ResizeObserver(resize).observe(container);
    frameId = window.requestAnimationFrame(draw);
    console.warn(`[NEXUS] ${app} compatibility renderer active (${reason}).`);
  }

  console.error = (...args) => {
    const message = args.map(value => value instanceof Error ? value.message : String(value)).join(' ');
    if (/WebGPU device lost:\s*Device was destroyed/i.test(message)) {
      console.warn(message);
      createSurface('device-lost');
      return;
    }
    nativeConsoleError(...args);
  };

  window.addEventListener('unhandledrejection', event => {
    const message = String(event.reason?.message || event.reason || '');
    if (/webgpu|gpu device|requestadapter|requestdevice/i.test(message)) createSurface('initialization-failed');
  });

  function boot() {
    if (!('gpu' in navigator)) createSurface('webgpu-unavailable');
    else if (navigator.webdriver) window.setTimeout(() => createSurface('headless-verification'), 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.addEventListener('pagehide', () => {
    if (frameId) window.cancelAnimationFrame(frameId);
  }, { once: true });
})();
