import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let _booted = false;

const SYSTEMS: Record<string, { color: number; starType: string; desc: string; rpRs: number; baseSpeed: number }> = {
  "Kepler-186": { color: 0x38bdf8, starType: "M-dwarf", desc: "Earth-size habitable zone", rpRs: 0.1, baseSpeed: 1 },
  "TRAPPIST-1": { color: 0xf97316, starType: "Ultra-cool", desc: "7 Earth-sized planets", rpRs: 0.12, baseSpeed: 1.4 },
  "HD 209458": { color: 0xfde68a, starType: "Sun-like", desc: "Hot Jupiter + Rings", rpRs: 0.15, baseSpeed: 0.7 }
};

const state: {
  sys: string;
  params: { noise: number; speed: number; rad: number; imp: number };
  paused: boolean;
  autoOrbit: boolean;
  demo: boolean;
  presentationMode: boolean;
  fluxHistory: number[];
  nasa: { catalog: Array<{ name: string; depth: string; period: string }>; idx: number; loaded: boolean };
  activePersona: string;
  theme: string;
  visualMode: string;
  log: Array<{ t: number; type: string; detail: string }>;
} = {
  sys: "Kepler-186",
  params: { noise: 10, speed: 20, rad: 100, imp: 10 },
  paused: false,
  autoOrbit: true,
  demo: false,
  presentationMode: false,
  fluxHistory: [],
  nasa: { catalog: [], idx: 0, loaded: false },
  activePersona: 'coach',
  theme: 'cosmic',
  visualMode: 'calm',
  log: []
};
const STORAGE_KEY = 'transit3d.lab.v1';

let demoTimer: ReturnType<typeof setInterval> | null = null;
let _insultMode = false;

const THEMES: Record<string, { accent: string; accent2: string; bg: string; panel: string }> = {
  cosmic: {
    accent: '#38bdf8',
    accent2: '#22c55e',
    bg: '#020617',
    panel: 'rgba(15, 23, 42, 0.96)'
  },
  magma: {
    accent: '#f97316',
    accent2: '#facc15',
    bg: '#111827',
    panel: 'rgba(17, 24, 39, 0.96)'
  },
  aurora: {
    accent: '#22c55e',
    accent2: '#a855f7',
    bg: '#020617',
    panel: 'rgba(15, 23, 42, 0.96)'
  }
};

const INSULT_LINES = [
  "Telemetry suggests your last prompt was... statistically suboptimal.",
  "Even the noise slider has more signal than that request.",
  "Recalculating. Strongly. Very strongly.",
  "That idea just triggered the anomaly detector.",
  "Results may vary. Your mileage definitely did."
];

function persistState() {
  try {
    const payload = {
      sys: state.sys,
      params: state.params,
      autoOrbit: state.autoOrbit,
      demo: state.demo,
      presentationMode: !!state.presentationMode,
      theme: state.theme || 'cosmic',
      activePersona: state.activePersona,
      visualMode: state.visualMode || 'calm'
    };
    window.localStorage && localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
  }
}

function loadPersistedState() {
  try {
    if (!window.localStorage) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.sys && SYSTEMS[saved.sys]) state.sys = saved.sys;
    if (saved.params) Object.assign(state.params, saved.params);
    if (typeof saved.autoOrbit === 'boolean') state.autoOrbit = saved.autoOrbit;
    if (typeof saved.demo === 'boolean') state.demo = saved.demo;
    if (typeof saved.presentationMode === 'boolean') state.presentationMode = saved.presentationMode;
    if (saved.theme) state.theme = saved.theme;
    if (saved.activePersona) state.activePersona = saved.activePersona;
    if (saved.visualMode) state.visualMode = saved.visualMode;
  } catch (e) {
  }
}

function applyTheme(nextTheme?: string) {
  const themeKey = nextTheme || state.theme || 'cosmic';
  const theme = THEMES[themeKey] || THEMES.cosmic;
  state.theme = themeKey;
  const root = document.documentElement;
  try {
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent2', theme.accent2);
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--panel', theme.panel);
    persistState();
  } catch (e) { }
}

function cycleTheme() {
  const order = ['cosmic', 'magma', 'aurora'];
  const idx = order.indexOf(state.theme || 'cosmic');
  const next = order[(idx + 1) % order.length];
  applyTheme(next);
}

function aiOrbSetState(mode: string | null) {
  try {
    const orb = document.getElementById('aiOrb');
    if (!orb) return;
    if (!mode) mode = 'idle';
    orb.setAttribute('data-mode', mode);
  } catch (e) { }
}

function playAdvisorChime() {
  try {
    const ACtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!ACtx) return;
    const ctx = new ACtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 680;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 260);
  } catch (e) { }
}

function triggerChaosPulse() {
  const keys = Object.keys(SYSTEMS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  setSystem(randomKey);
  const n = document.getElementById('noiseSlider') as HTMLInputElement | null;
  const s = document.getElementById('speedSlider') as HTMLInputElement | null;
  if (n) { state.params.noise = 5 + Math.random() * 25; n.value = String(state.params.noise); }
  if (s) { state.params.speed = 10 + Math.random() * 40; s.value = String(state.params.speed); }
  const nv = document.getElementById('noiseVal');
  const sv = document.getElementById('speedVal');
  if (nv) nv.textContent = state.params.noise.toFixed(0) + '%';
  if (sv) sv.textContent = (state.params.speed / 10).toFixed(1) + 'x';
  try { persistState(); } catch (e) { }
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let star: THREE.Mesh;
let planetGroup: THREE.Group;
let planet: THREE.Mesh;

function initThree() {
  const container = document.getElementById('threeRoot')!;

  scene = new THREE.Scene();

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.set(0, 2, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min((((window as any).UIHelpers && typeof (window as any).UIHelpers.getPixelRatio === "function") ? (window as any).UIHelpers.getPixelRatio("transit") : (window.devicePixelRatio || 1)), 2));
  (renderer as any).colorSpace = THREE.SRGBColorSpace;
  (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  try {
    if (renderer && renderer.domElement) {
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.addEventListener("touchmove", (e) => { try { e.preventDefault(); } catch (_) { } }, { passive: false });
    }
  } catch (_e) { }

  const amb = new THREE.AmbientLight(0xffffff, 0.1);
  const sun = new THREE.PointLight(0xffffff, 1.5, 100);
  scene.add(amb, sun);

  const starsGeo = new THREE.BufferGeometry();
  const pts: number[] = [];
  for (let i = 0; i < 500; i++) {
    pts.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
  }
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.1 }));
  scene.add(stars);

  const starGeo = new THREE.SphereGeometry(1.5, 64, 64);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  star = new THREE.Mesh(starGeo, starMat);
  scene.add(star);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.15 })
  );
  scene.add(glow);

  planetGroup = new THREE.Group();
  scene.add(planetGroup);

  const pGeo = new THREE.SphereGeometry(0.4, 32, 32);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.8 });
  planet = new THREE.Mesh(pGeo, pMat);
  planet.position.x = 6;
  planetGroup.add(planet);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = state.autoOrbit;
  controls.enablePan = true;

  animate();

  if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
    window.addEventListener('deviceorientation', (e) => {
      if (!controls || state.paused) return;
      const beta = (e.beta || 0);
      const gamma = (e.gamma || 0);

      const tiltX = Math.max(-30, Math.min(30, beta));
      const tiltY = Math.max(-30, Math.min(30, gamma));

      const factor = 0.02;
      const targetX = tiltY * factor;
      const targetY = 0.5 + tiltX * factor;

      controls.target.x += (targetX - controls.target.x) * 0.08;
      controls.target.y += (targetY - controls.target.y) * 0.08;
    });
  }

  window.addEventListener('resize', () => {
    const container = document.getElementById('threeRoot');
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  setTimeout(() => {
    const boot = document.getElementById('bootOverlay');
    const shell = document.getElementById('appShell');
    if (shell) shell.style.opacity = '1';
    if (boot) {
      boot.style.opacity = '0';
      setTimeout(() => {
        boot.style.display = 'none';
        const splash = document.getElementById('splashOverlay');
        if (splash) {
          splash.setAttribute('aria-hidden', 'false');
          splash.classList.remove('splash-stage-2');
        }
      }, 500);
    } else {
      const splash = document.getElementById('splashOverlay');
      if (splash) {
        splash.setAttribute('aria-hidden', 'false');
        splash.classList.remove('splash-stage-2');
      }
    }
  }, 1500);

  setTimeout(() => {
    const boot = document.getElementById('bootOverlay');
    if (boot && boot.style.display !== 'none') {
      const btn = document.getElementById('forceStartBtn');
      if (btn) (btn as HTMLElement).style.display = 'block';
    }
  }, 2500);
}

let animFrameId: number;

function cleanup() {
  try {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (controls) controls.dispose();
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
    if (scene) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
    }
  } catch (e) { }
}

window.addEventListener('beforeunload', cleanup);

function animate() {
  animFrameId = requestAnimationFrame(animate);

  if (!state.paused) {
    const spd = state.params.speed / 2000;
    planetGroup.rotation.y += spd;

    const angle = planetGroup.rotation.y % (Math.PI * 2);
    let flux = 1.0;
    const x = Math.sin(angle) * 6;
    const z = Math.cos(angle) * 6;

    if (z > 0 && Math.abs(x) < 2.0) {
      const imp = state.params.imp / 100;
      const depth = (state.params.rad / 1000) * 0.1;
      const dip = depth * Math.exp(-Math.pow(x, 2) / (0.5 + imp));
      flux -= dip;
    }

    const noise = (state.params.noise / 5000) * (Math.random() - 0.5);
    flux += noise;

    updateFluxGraph(flux);
    updateFluxAudio(flux);
  }

  if (state.autoOrbit && controls) controls.update();
  if (renderer && camera) renderer.render(scene, camera);
}

const fCanvas = document.getElementById('fluxCanvas') as HTMLCanvasElement;
const fCtx = fCanvas.getContext('2d')!;
fCanvas.width = fCanvas.clientWidth * (((window as any).UIHelpers && typeof (window as any).UIHelpers.getPixelRatio === "function") ? (window as any).UIHelpers.getPixelRatio("transit") : (window.devicePixelRatio || 1));
fCanvas.height = fCanvas.clientHeight * (((window as any).UIHelpers && typeof (window as any).UIHelpers.getPixelRatio === "function") ? (window as any).UIHelpers.getPixelRatio("transit") : (window.devicePixelRatio || 1));
const fData: number[] = new Array(100).fill(1.0);

function fluxPalette(t: number) {
  const a = [0.5, 0.5, 0.5];
  const b = [0.5, 0.5, 0.5];
  const c = [1.0, 1.0, 1.0];
  const d = [0.263, 0.416, 0.557];
  const r = a[0] + b[0] * Math.cos(2 * Math.PI * (c[0] * t + d[0]));
  const g = a[1] + b[1] * Math.cos(2 * Math.PI * (c[1] * t + d[1]));
  const bC = a[2] + b[2] * Math.cos(2 * Math.PI * (c[2] * t + d[2]));
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const to255 = (x: number) => Math.round(255 * clamp01(x));
  return `rgb(${to255(r)},${to255(g)},${to255(bC)})`;
}

function updateFluxGraph(val: number) {
  fData.push(val);
  fData.shift();

  const readout = document.getElementById('fluxReadout');
  if (readout) readout.textContent = val.toFixed(5);

  const w = fCanvas.width;
  const h = fCanvas.height;
  fCtx.clearRect(0, 0, w, h);

  const min = 0.98, max = 1.01;

  const grad = fCtx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, fluxPalette(0.0));
  grad.addColorStop(0.5, fluxPalette(0.5));
  grad.addColorStop(1.0, fluxPalette(1.0));
  fCtx.strokeStyle = grad;
  const mode = state.visualMode || 'calm';
  fCtx.lineWidth = mode === 'calm' ? 2 : (mode === 'extreme' ? 2.6 : 3.2);
  fCtx.beginPath();

  for (let i = 0; i < fData.length; i++) {
    const x = (i / (fData.length - 1)) * w;
    const y = h - ((fData[i] - min) / (max - min)) * h;
    if (i === 0) fCtx.moveTo(x, y); else fCtx.lineTo(x, y);
  }
  fCtx.stroke();
}

function ensureTransitAudio() {
  if ((window as any).__transitAudio) {
    const ctx = (window as any).__transitAudio.ctx;
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume();
    }
    return (window as any).__transitAudio;
  }
  const ACtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!ACtx) return null;
  let ctx: AudioContext;
  try {
    ctx = new ACtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    return null;
  }

  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = buffer;
  whiteNoise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 80;

  const pinkGain = ctx.createGain();
  pinkGain.gain.value = 0.02;

  whiteNoise.connect(filter);
  filter.connect(pinkGain);

  const scriptNode = ctx.createScriptProcessor(4096, 1, 1);
  let t = 0;
  scriptNode.onaudioprocess = function (e) {
    const out = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < out.length; i++) {
      const byte = (t * (42 & (t >> 10)) | t * 3 >> ((t >> 13) & 3));
      out[i] = ((byte & 255) / 128) - 1;
      t++;
    }
  };

  const byteGain = ctx.createGain();
  byteGain.gain.value = 0.0;

  const master = ctx.createGain();
  master.gain.value = 0.4;

  pinkGain.connect(master);
  scriptNode.connect(byteGain);
  byteGain.connect(master);
  master.connect(ctx.destination);

  whiteNoise.start();
  scriptNode.connect(byteGain);

  (window as any).__transitAudio = { ctx, filter, pinkGain, scriptNode, byteGain, master };
  return (window as any).__transitAudio;
}

function updateFluxAudio(flux: number) {
  const audio = (window as any).__transitAudio;
  if (!audio) return;
  const { ctx, filter, pinkGain } = audio;
  const depth = Math.max(0, Math.min(1, 1.0 - flux));
  const baseFreq = 40;
  const targetFreq = baseFreq + depth * 200;
  const mode = state.visualMode || 'calm';
  const baseGain = mode === 'calm' ? 0.02 : (mode === 'extreme' ? 0.06 : 0.1);
  const targetGain = baseGain + depth * 0.25;

  try {
    const now = ctx.currentTime;
    filter.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);
    pinkGain.gain.linearRampToValueAtTime(targetGain, now + 0.1);
  } catch (e) {
    filter.frequency.value = targetFreq;
    pinkGain.gain.value = targetGain;
  }
}

async function loadNasaData() {
  const lbl = document.getElementById('realTargetLabel');
  if (lbl) lbl.textContent = "NASA: Connecting...";
  setTimeout(() => {
    state.nasa.catalog = [
      { name: "Kepler-186f", depth: "0.1%", period: "130d" },
      { name: "TRAPPIST-1e", depth: "0.5%", period: "6d" },
      { name: "HD 209458 b", depth: "1.5%", period: "3.5d" }
    ];
    state.nasa.loaded = true;
    updateNasaUI();
  }, 2000);
}

function updateNasaUI() {
  const t = state.nasa.catalog[state.nasa.idx];
  const lbl = document.getElementById('realTargetLabel');
  if (lbl && t) lbl.textContent = `NASA: ${t.name} (${t.period})`;
}

function cycleReal(dir: number) {
  if (!state.nasa.loaded) return;
  const len = state.nasa.catalog.length;
  state.nasa.idx = (state.nasa.idx + dir + len) % len;
  updateNasaUI();
}

function setSystem(key: string) {
  state.sys = key;
  const sys = SYSTEMS[key];
  const nEl = document.getElementById('sysName');
  const mEl = document.getElementById('sysMeta');
  if (nEl) nEl.textContent = key.toUpperCase();
  if (mEl) mEl.textContent = sys.desc;

  if (star) (star.material as THREE.MeshBasicMaterial).color.setHex(sys.color);

  document.querySelectorAll('.sys-btn').forEach(b => {
    b.classList.toggle('active', (b as HTMLElement).innerText.includes(key.split(' ')[0].toUpperCase()));
  });
  try { logEvent('system', key); persistState(); } catch (e) { }
}

function togglePause() {
  state.paused = !state.paused;
  try { persistState(); } catch (e) { }
}

function toggleAuto() {
  state.autoOrbit = !state.autoOrbit;
  if (controls) controls.autoRotate = state.autoOrbit;
  try { persistState(); } catch (e) { }
}

function toggleDemo() {
  state.demo = !state.demo;
  if (state.demo) {
    state.autoOrbit = true;
    state.paused = false;
    if (demoTimer) clearInterval(demoTimer);
    const keys = Object.keys(SYSTEMS);
    demoTimer = setInterval(() => {
      if (!state.demo) return;
      setSystem(keys[Math.floor(Math.random() * keys.length)]);
    }, 5000);
  } else {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
    }
  }
  try { persistState(); } catch (e) { }
}

function setPersona(role: string) {
  if (!document.querySelector('.ai-card') && !document.querySelector('.ai-tabs')) { return; }
  state.activePersona = role;
  document.querySelectorAll('.ai-tab').forEach(b => {
    const isActive = b.textContent.trim().toLowerCase().includes(role);
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  try { logEvent('persona', role); persistState(); } catch (e) { }
}

function sendAI() {
  const inp = document.getElementById('aiInput') as HTMLTextAreaElement | HTMLInputElement | null;
  if (!inp) return;
  const raw = inp.value || "";
  const text = raw.trim();
  if (!text) return;

  const out = document.getElementById('aiOutput');
  const status = document.getElementById('aiStatus');

  aiOrbSetState('thinking');
  if (status) status.textContent = 'Routing to advisor…';
  if (out) out.textContent = `YOU: ${text.slice(0, 420)}`;

  inp.value = "";

  if (_insultMode && out) {
    const line = INSULT_LINES[Math.floor(Math.random() * INSULT_LINES.length)];
    out.textContent += `\n\nLAB (ROAST MODE): ${line}`;
  }

  try { logEvent('ai', text.slice(0, 120)); } catch (e) { }

  (window as any).AIAdvisorRouter?.runAdvisor({
    role: state.activePersona,
    userPrompt: text,
    ui: {
      setStatus: (s: string) => { if (status) status.textContent = s; },
      setText: (t: string) => {
        if (!out) return;
        out.textContent += `\n\nAI: ${t}`;
      },
      onDone: () => {
        aiOrbSetState('answering');
        playAdvisorChime();
        setTimeout(() => aiOrbSetState('idle'), 600);
      }
    }
  });
}

function setVisualMode(mode: string) {
  if (!['calm', 'extreme', 'insane'].includes(mode)) mode = 'calm';
  state.visualMode = mode;
  document.body.setAttribute('data-visual-mode', mode);
  const label = document.getElementById('modeLabel');
  if (label) {
    const nice = mode.charAt(0).toUpperCase() + mode.slice(1);
    label.textContent = nice;
  }
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const m = btn.getAttribute('data-mode');
    btn.classList.toggle('active', m === mode);
  });

  let audio = null;
  try { audio = ensureTransitAudio(); } catch (e) { }
  if (audio) {
    const now = audio.ctx.currentTime;
    const targetPink = mode === 'calm' ? 0.02 : (mode === 'extreme' ? 0.08 : 0.14);
    audio.pinkGain.gain.cancelScheduledValues(now);
    audio.pinkGain.gain.setValueAtTime(audio.pinkGain.gain.value, now);
    audio.pinkGain.gain.linearRampToValueAtTime(targetPink, now + 0.3);

    const targetByte = mode === 'insane' ? 0.12 : 0.0;
    audio.byteGain.gain.cancelScheduledValues(now);
    audio.byteGain.gain.setValueAtTime(audio.byteGain.gain.value, now);
    audio.byteGain.gain.linearRampToValueAtTime(targetByte, now + 0.4);
  }

  try { logEvent('visualMode', mode); persistState(); } catch (e) { }
}

function logEvent(type: string, detail: string) {
  try {
    if (!state.log) state.log = [];
    const entry = { t: Date.now(), type, detail };
    state.log.push(entry);
    if (state.log.length > 60) state.log.shift();
    if (typeof setStatusPill === 'function') {
      setStatusPill(type === 'showtime' ? 'showtime' : 'active', 'LIVE SENSOR FEED');
      if (_statusTimer) clearTimeout(_statusTimer);
      _statusTimer = setTimeout(() => setStatusPill('idle'), 1600);
    }
  } catch (e) { }
}

let _statusTimer: ReturnType<typeof setTimeout> | null = null;
function setStatusPill(mode: string, label?: string) {
  try {
    const pill = document.getElementById('statusPill');
    if (!pill) return;
    if (mode) pill.setAttribute('data-state', mode);
    const span = pill.querySelector('.status-pill-label');
    if (span && label) span.textContent = label;
  } catch (e) { }
}

function togglePresentation() {
  const root = document.getElementById('appShell');
  state.presentationMode = !state.presentationMode;
  if (state.presentationMode) {
    try { ensureTransitAudio(); } catch (e) { }
    state.autoOrbit = true;
    state.paused = false;
    if (state.params.speed < 26) {
      state.params.speed = 26;
      const s = document.getElementById('speedSlider') as HTMLInputElement | null;
      const sv = document.getElementById('speedVal');
      if (s) s.value = String(state.params.speed);
      if (sv) sv.textContent = (state.params.speed / 10).toFixed(1) + 'x';
    }
    if (root) root.classList.add('presentation-mode');
    try {
      const threeRoot = document.getElementById('threeRoot');
      if (threeRoot && threeRoot.requestFullscreen) threeRoot.requestFullscreen();
    } catch (e) { }
  } else {
    if (root) root.classList.remove('presentation-mode');
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } catch (e) { }
  }
  try { logEvent('presentation', state.presentationMode ? 'on' : 'off'); persistState(); } catch (e) { }
}

function resetLab() {
  state.params = { noise: 10, speed: 20, rad: 100, imp: 10 };
  const bindings = [
    ['noiseSlider', 'noiseVal', 'noise', (v: number) => v + '%'],
    ['speedSlider', 'speedVal', 'speed', (v: number) => (v / 10).toFixed(1) + 'x'],
    ['radiusSlider', 'radVal', 'rad', (v: number) => (v / 100).toFixed(2) + 'x'],
    ['impactSlider', 'impVal', 'imp', (v: number) => (v / 100).toFixed(2)]
  ] as const;
  bindings.forEach(([id, labId, key, fmt]) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const lab = document.getElementById(labId);
    const val = state.params[key as keyof typeof state.params];
    if (el) el.value = String(val);
    if (lab) lab.textContent = fmt(val);
  });
  try { logEvent('reset', 'lab'); persistState(); } catch (e) { }
}

function sendRobotPrompt(text: string) {
  const input = document.getElementById('aiInput') as HTMLTextAreaElement | HTMLInputElement | null;
  if (input) {
    input.value = text;
    sendAI();
  }
}

function setOverlayVisible(id: string, visible: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function showAbout() { setOverlayVisible('aboutOverlay', true); }
function hideAbout() { setOverlayVisible('aboutOverlay', false); }
function showReadme() { setOverlayVisible('readmeOverlay', true); }
function hideReadme() { setOverlayVisible('readmeOverlay', false); }
function showCredits() { setOverlayVisible('creditsOverlay', true); }
function hideCredits() { setOverlayVisible('creditsOverlay', false); }
function show404() { setOverlayVisible('notfoundOverlay', true); }
function hide404() { setOverlayVisible('notfoundOverlay', false); }

function setupCursorGlow() {
  try {
    const glow = document.getElementById('cursorGlow');
    if (!glow) return;
    const mq = window.matchMedia && window.matchMedia('(pointer: coarse)');
    if (mq && mq.matches) {
      document.body.setAttribute('data-no-cursor-glow', 'true');
      return;
    }
    window.addEventListener('mousemove', (e) => {
      glow.style.opacity = '1';
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    });
    window.addEventListener('mouseleave', () => {
      glow.style.opacity = '0';
    });
  } catch (e) { }
}

const _KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let _konamiIdx = 0;

function setupKonami() {
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (!key) return;
    const expected = _KONAMI[_konamiIdx];
    if (key === expected || key.toLowerCase() === expected) {
      _konamiIdx++;
      if (_konamiIdx === _KONAMI.length) {
        _konamiIdx = 0;
        revealDevPanel();
      }
    } else {
      _konamiIdx = 0;
    }
  });
}

function revealDevPanel() {
  try {
    let panel = document.getElementById('devPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'devPanel';
      panel.style.position = 'fixed';
      panel.style.right = '16px';
      panel.style.bottom = '16px';
      panel.style.width = 'min(360px, 90vw)';
      panel.style.maxHeight = '50vh';
      panel.style.borderRadius = '12px';
      panel.style.border = '1px solid rgba(148,163,184,0.8)';
      panel.style.background = 'rgba(15,23,42,0.98)';
      panel.style.boxShadow = '0 24px 80px rgba(0,0,0,0.95)';
      panel.style.padding = '10px 12px';
      panel.style.zIndex = '80';
      panel.style.fontSize = '12px';
      panel.style.color = '#e5e7eb';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.gap = '6px';
      panel.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
    <div style="letter-spacing:0.16em;font-size:10px;text-transform:uppercase;opacity:0.8;">DEV CONSOLE // TRANSIT</div>
    <div style="display:flex;gap:4px;align-items:center;">
      <button id="devThemeBtn" class="btn" style="padding:2px 6px;font-size:10px;">Theme</button>
      <button id="devChaosBtn" class="btn" style="padding:2px 6px;font-size:10px;">Chaos</button>
      <button id="devInsultBtn" class="btn" style="padding:2px 6px;font-size:10px;">Insult</button>
      <button id="devCloseBtn" class="btn" style="padding:2px 6px;font-size:10px;">×</button>
    </div>
  </div>
  <pre id="dev-panel-body" style="margin:0;padding:4px 6px;background:rgba(15,23,42,0.9);border-radius:8px;overflow:auto;white-space:pre-wrap;"></pre>
         `;
      document.body.appendChild(panel);

      document.getElementById('devCloseBtn')!.onclick = () => panel!.remove();
      document.getElementById('devThemeBtn')!.onclick = () => cycleTheme();
      document.getElementById('devChaosBtn')!.onclick = () => triggerChaosPulse();
      document.getElementById('devInsultBtn')!.onclick = () => { _insultMode = !_insultMode; };
    }
    const body = document.getElementById('dev-panel-body');
    if (body) {
      const snap = {
        sys: state.sys,
        params: state.params,
        autoOrbit: state.autoOrbit,
        paused: state.paused,
        demo: state.demo,
        presentationMode: !!state.presentationMode,
        theme: state.theme || 'cosmic',
        activePersona: state.activePersona,
        visualMode: state.visualMode,
        nasaLoaded: state.nasa.loaded,
        fluxPoints: state.fluxHistory.length,
        logCount: (state.log || []).length
      };
      body.textContent = JSON.stringify(snap, null, 2) +
        '\n\n# sample robots.txt\nUser-agent: *\nDisallow: /dev\nAllow: /\n';
      const log = (state.log || []).slice().reverse().slice(0, 15);
      if (log.length) {
        body.textContent += '\n\n# telemetry (latest first)\n';
        log.forEach((entry, idx) => {
          const ts = new Date(entry.t).toISOString();
          const detail = typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail);
          body.textContent += `[${idx + 1}] ${ts} :: ${entry.type} :: ${detail}\n`;
        });
      }
    }
  } catch (e) { }
}

function wireUI() {
  const bindSlider = (id: string, paramKey: keyof typeof state.params, dispId: string, fmt: (v: number) => string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const lab = document.getElementById(dispId);
    if (!el) return;
    const apply = (val: string) => {
      const num = parseFloat(val);
      state.params[paramKey] = num;
      if (lab) lab.textContent = fmt(num);
    };
    el.addEventListener('input', (e) => {
      apply((e.target as HTMLInputElement).value);
      try { persistState(); } catch (e) { }
    });
    const initial = state.params[paramKey] ?? parseFloat(el.value);
    if (initial != null) {
      el.value = String(initial);
      apply(String(initial));
    }
  };

  bindSlider('noiseSlider', 'noise', 'noiseVal', v => v + '%');
  bindSlider('speedSlider', 'speed', 'speedVal', v => (v / 10).toFixed(1) + 'x');
  bindSlider('radiusSlider', 'rad', 'radVal', v => (v / 100).toFixed(2) + 'x');
  bindSlider('impactSlider', 'imp', 'impVal', v => (v / 100).toFixed(2));

  document.querySelectorAll('.ai-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.textContent.trim().toLowerCase();
      setPersona(role);
    });
    btn.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        e.preventDefault();
        (e.target as HTMLElement).click();
      }
    });
  });

  const titleEl = document.getElementById('appTitle');
  if (titleEl) {
    titleEl.addEventListener('dblclick', () => cycleTheme());
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAbout();
      hideReadme();
      hideCredits();
      hide404();
    }
  });

  setupCursorGlow();
  setupKonami();
}

function showSplashStage2() {
  const ov = document.getElementById('splashOverlay');
  if (!ov) return;
  ov.classList.add('splash-stage-2');
}

function enterLabFromSplash() {
  const ov = document.getElementById('splashOverlay');
  if (ov) {
    ov.setAttribute('aria-hidden', 'true');
    ov.classList.remove('splash-stage-2');
  }
  const boot = document.getElementById('bootOverlay');
  const shell = document.getElementById('appShell');
  if (boot) {
    boot.style.opacity = '0';
    boot.style.display = 'none';
  }
  if (shell) shell.style.opacity = '1';
  try { logEvent('splash', 'enterLab'); } catch (e) { }
}

let _showtimeRunning = false;
function runShowtime() {
  if (_showtimeRunning) return;
  _showtimeRunning = true;

  let audio: any = null;
  try { audio = ensureTransitAudio(); } catch (e) { }
  if (audio && audio.byteGain) {
    try {
      const now = audio.ctx.currentTime;
      audio.byteGain.gain.cancelScheduledValues(now);
      audio.byteGain.gain.setValueAtTime(audio.byteGain.gain.value, now);
      audio.byteGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
    } catch (e) { }
  }

  try { logEvent('showtime', 'start'); } catch (e) { }
  try { setStatusPill && setStatusPill('showtime', 'SHOWTIME SCRIPT'); } catch (e) { }

  resetLab();
  const seq = [
    () => { setSystem('TRAPPIST-1'); setVisualMode('extreme'); },
    () => { togglePresentation(); },
    () => {
      const n = document.getElementById('noiseSlider') as HTMLInputElement | null;
      const s = document.getElementById('speedSlider') as HTMLInputElement | null;
      const r = document.getElementById('radiusSlider') as HTMLInputElement | null;
      const i = document.getElementById('impactSlider') as HTMLInputElement | null;
      if (n) n.value = '26';
      if (s) s.value = '32';
      if (r) r.value = '140';
      if (i) i.value = '22';
      state.params = { noise: 26, speed: 32, rad: 140, imp: 22 };
      try { persistState(); } catch (e) { }
    },
    () => {
      setPersona('idea');
      sendRobotPrompt('Give me a one-line cinematic description of this transit.');
    },
    () => {
      setSystem('Kepler-186');
      setPersona('coach');
      setVisualMode('calm');
    }
  ];

  let idx = 0;
  function next() {
    if (idx < seq.length) {
      try { seq[idx++](); } catch (e) { }
      setTimeout(next, 1800);
    } else {
      try { logEvent('showtime', 'end'); } catch (e) { }
      try { setStatusPill && setStatusPill('idle', 'LIVE SENSOR FEED'); } catch (e) { }
      _showtimeRunning = false;

      if (audio && audio.byteGain) {
        try {
          const now2 = audio.ctx.currentTime;
          audio.byteGain.gain.cancelScheduledValues(now2);
          audio.byteGain.gain.setValueAtTime(audio.byteGain.gain.value, now2);
          audio.byteGain.gain.linearRampToValueAtTime(0.0, now2 + 1.0);
        } catch (e) { }
      }
    }
  }
  next();
}

try {
  console.clear();
  const _bootStyle = 'background:#020617;color:#e5e7eb;font-size:13px;padding:4px 8px;border-radius:4px;';
  console.log('%c TRANSIT 3D // PRESTIGE ', 'background:#0f172a;color:#38bdf8;font-size:16px;padding:8px 12px;border-radius:999px;');
  console.log('%c[GPU] Three.js scene online', _bootStyle);
  console.log('%c[LAB] Flux engine synced to orbit', _bootStyle);
  console.log('%c[AI] Advisor stack idle; awaiting query', _bootStyle);
} catch (e) { }

function bootLab() {
  if (_booted) return;
  _booted = true;
  try { loadPersistedState(); } catch (e) { }
  try { applyTheme(); } catch (e) { }
  try { initThree(); } catch (e) { }
  try { wireUI(); } catch (e) { }
  try {
    const sysKey = state.sys && SYSTEMS[state.sys] ? state.sys : 'Kepler-186';
    setSystem(sysKey);
  } catch (e) { }
  try {
    const persona = state.activePersona || 'coach';
    setPersona(persona);
  } catch (e) { }
  try { loadNasaData(); } catch (e) { }
  try { setStatusPill('idle', 'LIVE SENSOR FEED'); } catch (e) { }
  try { setVisualMode(state.visualMode || 'calm'); } catch (e) { }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.paused = true;
      try { setStatusPill && setStatusPill('idle', 'PAUSED (tab hidden)'); } catch (e) { }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLab);
  } else {
    bootLab();
  }
}

const app = {
  setSystem,
  togglePause,
  toggleAuto,
  toggleDemo,
  cycleReal,
  setPersona,
  sendAI,
  togglePresentation,
  resetLab,
  sendRobotPrompt,
  setVisualMode
};

(window as any).app = app;
(window as any).forceBoot = function () {
  const _boot = document.getElementById('bootOverlay'); if (_boot) _boot.style.display = 'none';
  document.getElementById('appShell')!.style.opacity = '1';
};

(window as any).transitBot = {
  setSystem,
  togglePause,
  toggleAuto,
  toggleDemo,
  cycleReal,
  setPersona,
  sendAI,
  togglePresentation,
  resetLab,
  sendRobotPrompt,
  setVisualMode,
  showtime: runShowtime
};
(window as any).__showTransitAbout = showAbout;
(window as any).__hideTransitAbout = hideAbout;
(window as any).__showTransitReadme = showReadme;
(window as any).__hideTransitReadme = hideReadme;
(window as any).__showTransitCredits = showCredits;
(window as any).__hideTransitCredits = hideCredits;
(window as any).__showTransit404 = show404;
(window as any).__hideTransit404 = hide404;

(window as any).__transitSplashNext = showSplashStage2;
(window as any).__transitEnterLab = enterLabFromSplash;

const path = window.location && window.location.pathname || '';
const hash = window.location && window.location.hash || '';
if (path.endsWith('/404') || hash === '#404') {
  show404();
}
