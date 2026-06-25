import { boot } from './boot';
import { wireControls, updateBodyUI } from './ui/controls';
import { SceneRenderer } from './renderer/scene-renderer';

async function main() {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('[AEON] canvas-container not found');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  try {
    const { device, state, log } = await boot(canvas);
    const scene = new SceneRenderer(device);
    await scene.init();

    const hideLoader = () => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => (loader.style.display = 'none'), 300);
      }
    };

    const cleanupControls = wireControls(
      state,
      (partial) => {
        Object.assign(state, partial);
        if (partial.sunAngle !== undefined) scene.sunAngle = partial.sunAngle;
        if (partial.eclipse !== undefined) scene.eclipse = partial.eclipse;
        if (partial.binary !== undefined) scene.binary = partial.binary;
      },
      {
        onWarp: (body) => {
          log(`Warp jump to ${body.toUpperCase()} initiated.`);
          updateBodyUI(body);
          state.body = body as typeof state.body;
          scene.setBody(body);
          updateChemistry(body);
        },
        onScan: () => {
          if (state.scanning) return;
          state.scanning = true;
          log('Scanning surface geometry...');
          setTimeout(() => {
            state.scanning = false;
            log('Surface scan complete.');
          }, 3000);
        },
        onHeroCam: () => {
          log('HERO CAMERA SEQUENCE not yet implemented.');
        },
        onQualityToggle: () => {
          log('Quality toggle not yet implemented.');
        },
        onInsaneToggle: () => {
          log('INSANE MODE not yet implemented.');
        },
      }
    );

    const updateChemistry = (body: string) => {
      const bodyDesc = document.getElementById('bodyDesc');
      const chemList = document.getElementById('chemList');
      if (!bodyDesc || !chemList) return;

      const bodies: Record<string, { desc: string; chem: Record<string, number> }> = {
        saturn: { desc: 'Ringed gas giant. Oil-slick spectral iridescence.', chem: { 'H\u2082 + He': 96, 'Trace Methane': 4 } },
        pluto: { desc: 'Dwarf world with bright N\u2082 ice heart.', chem: { 'N\u2082 Ice': 50, 'CH\u2084 Ice': 30, 'CO Ice': 20 } },
        mars: { desc: 'Thin CO\u2082 atmosphere; Tharsis bulge sculpted.', chem: { 'CO\u2082 Atmosphere': 95, 'N\u2082': 3, 'Ar': 2 } },
        ceres: { desc: 'Dark main-belt body with bright salt centers.', chem: { Silicates: 60, 'Water Ice': 30, Salts: 10 } },
        europa: { desc: 'Ocean world: fractured ice crust.', chem: { 'Water Ice': 80, Salts: 15, Organics: 5 } },
      };

      const info = bodies[body];
      if (!info) return;
      bodyDesc.textContent = info.desc;
      chemList.innerHTML = '';
      Object.entries(info.chem).forEach(([name, pct]) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; margin-bottom:2px;';
        row.innerHTML = `<span>${name}</span><span>${pct}%</span>`;
        chemList.appendChild(row);
      });
    };

    updateChemistry('saturn');

    const loadVal = document.getElementById('loadVal');
    if (loadVal) loadVal.style.width = '100%';

    setTimeout(hideLoader, 500);

    // Wire sun angle slider to scene renderer
    const sunSlider = document.getElementById('sunSlider') as HTMLInputElement;
    if (sunSlider) {
      scene.sunAngle = Number(sunSlider.value);
    }

    let lastTime = performance.now();
    let perfDisplayTimer = 0;
    let elapsed = 0;
    function frame(now: number) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      scene.update(dt);
      scene.render();
      requestAnimationFrame(frame);
      elapsed += dt;

      // Update performance display every second
      perfDisplayTimer += dt;
      if (perfDisplayTimer >= 1) {
        perfDisplayTimer = 0;
        const stats = scene.getStats();
        const devStats = document.getElementById('devStats');
        if (devStats) {
          devStats.textContent = [
            `FPS: ${stats.fps}`,
            `Triangles: ${stats.triangles.toLocaleString()}`,
            `Draw calls: ${stats.drawCalls}`,
            `Shadow: ${stats.shadowQuality > 0 ? 'High (2048)' : 'Low (1024)'}`,
            `LOD bias: ${stats.lodBias}`,
          ].join('\n');
        }
        if (stats.fps < 25) {
          const opsLog = document.getElementById('opsLog');
          if (opsLog) {
            const entry = document.createElement('div');
            entry.className = 'ops-log-entry';
            entry.innerHTML = `<span class="ts">T+${Math.floor(elapsed)}</span><span class="msg" style="color:var(--danger)">Performance degraded — reducing quality.</span>`;
            opsLog.appendChild(entry);
            if (opsLog.children.length > 50) opsLog.removeChild(opsLog.firstChild!);
            opsLog.scrollTop = opsLog.scrollHeight;
          }
        }
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          device.resize(width, height);
          scene.resize();
        }
      }
    });
    resizeObserver.observe(container);

    window.addEventListener('beforeunload', () => {
      resizeObserver.disconnect();
      cleanupControls();
      scene.destroy();
    });

    requestAnimationFrame(frame);

    log(`Backend: ${device.backend.toUpperCase()} — ${device.width}x${device.height}`);
  } catch (err) {
    console.error('[AEON] Boot failed:', err);
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    const crash = document.getElementById('system-crash');
    if (crash) {
      crash.classList.add('visible');
      const msg = document.getElementById('crash-msg');
      if (msg) msg.textContent = String(err);
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
