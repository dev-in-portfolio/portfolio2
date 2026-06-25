import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

// --- STATE ---
const state: Record<string, any> = {
  shapeFamily: "galaxy",
  n: 5,
  mode: 3,
  mix4D: 0.7,
  densityScale: 1.0,
  orbitSpeed: 1.0,
  wSpeed: 1.0,
  brightness: 1.0,
  palette: "spectral",
  autoOrbit: true,
  animate4D: true,

  // --- Techniques (T155/T168/T159) ---
  t155Enabled: true,
  t168Enabled: false,
  t159Enabled: false
};

const PRESET_DEFAULTS: Record<string, { n: number; mode: number; mix4D: number; densityScale: number }> = {
  "c1_atlas_shatter_nonclosing": { n: 7, mode: 6, mix4D: 0.85, densityScale: 1.15 },
  "c1_duality_braided_swaps": { n: 8, mode: 3, mix4D: 0.95, densityScale: 1.05 },
  "c1_flip_lock_closure": { n: 8, mode: 5, mix4D: 1.00, densityScale: 1.10 },
  "c1_hyperwarp_patchwork": { n: 7, mode: 2, mix4D: 0.90, densityScale: 1.40 },
  "c1_retile_cascade": { n: 9, mode: 7, mix4D: 0.88, densityScale: 1.35 },
  "c1_seam_foam_critical": { n: 6, mode: 4, mix4D: 0.92, densityScale: 1.25 },
  "c2_hard_orientifold_cut": { n: 6, mode: 5, mix4D: 1.00, densityScale: 1.00 },
  "c2_kaleidoscope_multiplane": { n: 9, mode: 7, mix4D: 0.85, densityScale: 1.25 },
  "c2_soft_bleed_ghost": { n: 7, mode: 4, mix4D: 0.90, densityScale: 1.10 },
  "c2_twisted_phase_ramp": { n: 8, mode: 6, mix4D: 0.95, densityScale: 1.05 },
  "c3_branching_throat_network": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.35 },
  "c3_epsilon_pinch_singularity": { n: 9, mode: 6, mix4D: 0.90, densityScale: 1.30 },
  "c3_long_throat_deepwell": { n: 8, mode: 5, mix4D: 0.85, densityScale: 1.20 },
  "c3_looped_throat_ring": { n: 8, mode: 6, mix4D: 0.92, densityScale: 1.10 },
  "c3_mode_mixing_axis": { n: 7, mode: 3, mix4D: 0.95, densityScale: 1.05 },
  "c3_resolved_cap_glow": { n: 7, mode: 4, mix4D: 1.00, densityScale: 1.15 },
  "c3_throat_flux_spiral": { n: 9, mode: 5, mix4D: 0.88, densityScale: 1.25 },
  "c4_brane_crystal": { n: 9, mode: 6, mix4D: 0.85, densityScale: 1.25 },
  "c4_brane_foam": { n: 9, mode: 7, mix4D: 0.88, densityScale: 1.40 },
  "c4_collision_event": { n: 8, mode: 6, mix4D: 0.80, densityScale: 1.20 },
  "c4_moire_stacks": { n: 7, mode: 4, mix4D: 0.90, densityScale: 1.15 },
  "c4_open_string_dominant": { n: 9, mode: 3, mix4D: 1.00, densityScale: 1.05 },
  "c4_percolation_skeleton": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.35 },
  "c4_tangled_warped_sheets": { n: 8, mode: 5, mix4D: 0.95, densityScale: 1.30 },
  "c5_cascading_growth": { n: 9, mode: 7, mix4D: 0.88, densityScale: 1.40 },
  "c5_dense_loopy_web": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.30 },
  "c5_filament_spider": { n: 8, mode: 3, mix4D: 1.00, densityScale: 1.20 },
  "c5_frustrated_jitter": { n: 9, mode: 6, mix4D: 0.95, densityScale: 1.25 },
  "c5_hub_monument": { n: 7, mode: 4, mix4D: 0.90, densityScale: 1.05 },
  "c5_orientifold_web_flip": { n: 8, mode: 6, mix4D: 0.95, densityScale: 1.10 },
  "c5_tension_contrast": { n: 8, mode: 5, mix4D: 0.85, densityScale: 1.15 },
  "c6_anisotropic_decode": { n: 7, mode: 5, mix4D: 0.85, densityScale: 1.10 },
  "c6_boundary_fracture_faults": { n: 9, mode: 7, mix4D: 0.88, densityScale: 1.30 },
  "c6_boundary_glyph_drive": { n: 9, mode: 7, mix4D: 1.00, densityScale: 1.40 },
  "c6_boundary_locked_skin": { n: 8, mode: 5, mix4D: 0.90, densityScale: 1.25 },
  "c6_boundary_to_bulk_braid": { n: 8, mode: 6, mix4D: 0.92, densityScale: 1.25 },
  "c6_bulk_dominant_turbulence": { n: 8, mode: 5, mix4D: 0.80, densityScale: 1.35 },
  "c6_decode_interior_lattice": { n: 9, mode: 7, mix4D: 0.85, densityScale: 1.35 },
  "c6_multi_shell_boundaries": { n: 8, mode: 6, mix4D: 0.88, densityScale: 1.15 },
  "c6_phase_flip_boundary": { n: 7, mode: 4, mix4D: 1.00, densityScale: 1.20 },
  "c6_sparse_dense_toggle": { n: 7, mode: 3, mix4D: 1.00, densityScale: 1.35 },
  "c6_spectral_hologram": { n: 8, mode: 5, mix4D: 0.90, densityScale: 1.20 },
  "c6_standing_wave_shells": { n: 8, mode: 6, mix4D: 0.90, densityScale: 1.10 },
  "c6_wormhole_boundary_bridge": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.30 },
  "c7_boundary_coupled_flux": { n: 8, mode: 6, mix4D: 0.95, densityScale: 1.30 },
  "c7_braid_collapse": { n: 9, mode: 6, mix4D: 0.90, densityScale: 1.35 },
  "c7_braid_shockwave": { n: 8, mode: 5, mix4D: 0.88, densityScale: 1.25 },
  "c7_chirality_flip_stack": { n: 7, mode: 4, mix4D: 1.00, densityScale: 1.10 },
  "c7_figure8_knot": { n: 8, mode: 6, mix4D: 0.88, densityScale: 1.30 },
  "c7_fractal_braid_word": { n: 9, mode: 6, mix4D: 0.95, densityScale: 1.40 },
  "c7_high_n_superbraid": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.20 },
  "c7_hopf_fibration_field": { n: 9, mode: 7, mix4D: 0.85, densityScale: 1.35 },
  "c7_linked_ring_chain": { n: 7, mode: 6, mix4D: 0.90, densityScale: 1.20 },
  "c7_multicycle_bouquet": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.20 },
  "c7_quantized_snap_ladder": { n: 8, mode: 4, mix4D: 1.00, densityScale: 1.15 },
  "c7_resonant_beatlock": { n: 8, mode: 5, mix4D: 0.90, densityScale: 1.05 },
  "c7_topological_pump": { n: 7, mode: 7, mix4D: 1.00, densityScale: 1.15 },
  "c7_trefoil_max": { n: 8, mode: 5, mix4D: 0.92, densityScale: 1.25 },
  "c7_vortex_tube_flux": { n: 8, mode: 5, mix4D: 0.85, densityScale: 1.35 },
  "c7_writhe_snarl": { n: 9, mode: 6, mix4D: 0.85, densityScale: 1.35 },
  "c8_bifurcation_blossom": { n: 8, mode: 6, mix4D: 0.95, densityScale: 1.30 },
  "c8_brane_pierced": { n: 9, mode: 7, mix4D: 0.88, densityScale: 1.35 },
  "c8_component_merge_split": { n: 7, mode: 4, mix4D: 0.92, densityScale: 1.25 },
  "c8_conifold_embedded": { n: 8, mode: 7, mix4D: 0.90, densityScale: 1.30 },
  "c8_cusp_forest": { n: 8, mode: 6, mix4D: 0.90, densityScale: 1.25 },
  "c8_foam_labyrinth": { n: 9, mode: 7, mix4D: 0.88, densityScale: 1.40 },
  "c8_genus_transition_cascade": { n: 8, mode: 6, mix4D: 1.00, densityScale: 1.20 },
  "c8_handles_on_handles": { n: 9, mode: 7, mix4D: 0.95, densityScale: 1.40 },
  "c8_high_genus_labyrinth": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.30 },
  "c8_holographic_encoded_slice": { n: 9, mode: 6, mix4D: 1.00, densityScale: 1.40 },
  "c8_mirrored_amoeba": { n: 7, mode: 6, mix4D: 1.00, densityScale: 1.15 },
  "c8_near_singular_creasing": { n: 8, mode: 6, mix4D: 0.95, densityScale: 1.25 },
  "c8_percolated_tunnels": { n: 9, mode: 7, mix4D: 0.90, densityScale: 1.35 },
  "c8_polynomial_amoeba_slice": { n: 8, mode: 6, mix4D: 0.90, densityScale: 1.30 },
  "c8_self_avoid_polished": { n: 7, mode: 5, mix4D: 0.90, densityScale: 1.10 },
  "c8_sheet_stack_weave": { n: 7, mode: 5, mix4D: 0.88, densityScale: 1.20 },
  "c8_slice_phase_morph": { n: 7, mode: 4, mix4D: 1.00, densityScale: 1.10 },
  "c8_spiky_starfold": { n: 8, mode: 5, mix4D: 0.90, densityScale: 1.25 },
  "c8_swiss_cheese_max": { n: 9, mode: 6, mix4D: 0.85, densityScale: 1.40 },
  "c8_trig_triply_periodic": { n: 9, mode: 7, mix4D: 0.85, densityScale: 1.35 },
};

// --- THREE.JS VARS ---
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, points: THREE.Points, geometry: THREE.BufferGeometry, material: THREE.PointsMaterial;
let composer: EffectComposer, renderPass: RenderPass, ssaoPass: SSAOPass, bloomPass: UnrealBloomPass;

let basePoints: { x: number; y: number; z: number; w: number; u: number; v: number }[] = [];
let positions: Float32Array, colors: Float32Array;
const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
const viewContainer = document.getElementById("viewContainer") as HTMLElement;

// --- VIEWPORT FIT (P14) ---
function _getShellHeight() {
  const sel = ['#labShell', '#labShellBar', '.lab-shell', '.lab-shell-bar', '.labshell', '.nexusShell'];
  for (const s of sel) {
    const el = document.querySelector(s);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r && r.height) return r.height;
    }
  }
  return 0;
}

function setViewportVars() {
  document.documentElement.style.setProperty('--svh', `${window.innerHeight}px`);
  document.documentElement.style.setProperty('--shellH', `${_getShellHeight()}px`);
}

let _resizeRAF = 0;
function scheduleResize() {
  if (_resizeRAF) return;
  _resizeRAF = requestAnimationFrame(() => {
    _resizeRAF = 0;
    setViewportVars();
    try { resize(); } catch (_e) { }
  });
}

const _mo = new MutationObserver(() => scheduleResize());
try { _mo.observe(document.body, { childList: true, subtree: true }); } catch (_e) { }
setViewportVars();
requestAnimationFrame(() => scheduleResize());
setTimeout(() => scheduleResize(), 180);
setTimeout(() => scheduleResize(), 420);
window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 250), { passive: true });

// --- ANIMATION VARS ---
let angleXW = 0, angleYW = 0, angleZW = 0;
let rotX = 0.2, rotY = 0.6, targetRotX = 0.2, targetRotY = 0.6;
let camDist = 8.0, targetCamDist = 8.0;
let lastTime = performance.now();
let lastInteractionTime = 0;
let isDragging = false, lastPointerX = 0, lastPointerY = 0;
let animationFrameId = 0;

// --- DOM ELEMENTS ---
const ui: Record<string, any> = {
  shapeSelect: document.getElementById("shapeFamilySelect") as HTMLSelectElement,
  nSlider: document.getElementById("nSlider") as HTMLInputElement,
  modeSlider: document.getElementById("modeSlider") as HTMLInputElement,
  mixSlider: document.getElementById("mixSlider") as HTMLInputElement,
  densitySlider: document.getElementById("densitySlider") as HTMLInputElement,
  t155Toggle: document.getElementById("t155Toggle") as HTMLInputElement,
  t168Toggle: document.getElementById("t168Toggle") as HTMLInputElement,
  t159Toggle: document.getElementById("t159Toggle") as HTMLInputElement,
  screenshotBtn: document.getElementById("btnScreenshot") as HTMLButtonElement,
  readouts: {
    n: document.getElementById("nReadout") as HTMLElement,
    mode: document.getElementById("modeReadout") as HTMLElement,
    mix: document.getElementById("mixReadout") as HTMLElement,
    density: document.getElementById("densityReadout") as HTMLElement
  },
  overlays: {
    family: document.getElementById("overlayFamily") as HTMLElement,
    n: document.getElementById("overlayN") as HTMLElement,
    mode: document.getElementById("overlayMode") as HTMLElement
  },
  stats: {
    points: document.getElementById("statusPoints") as HTMLElement,
    fps: document.getElementById("statusFPS") as HTMLElement
  }
};

// --- MATH HELPERS ---
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// --- TECHNIQUES ---------------------------------------------------------
const T155_PR = {
  low: 0.9,
  high: Math.min(2.0, (window.devicePixelRatio || 1)),
  idleDelayMs: 200,
  rampFrames: 8
};
let t155Interacting = false;
let t155LastInputAt = performance.now();
let t155TargetPR = T155_PR.high;
let t155CurrentPR = T155_PR.high;

let screenshotInProgress = false;
let beautyMode = false;

function markInputT155() {
  if (!state.t155Enabled || screenshotInProgress || !renderer) return;
  t155Interacting = true;
  t155LastInputAt = performance.now();
  t155TargetPR = T155_PR.low;
}

function updatePixelRatioT155() {
  if (!state.t155Enabled || screenshotInProgress || !renderer) return;
  const now = performance.now();
  if (t155Interacting && (now - t155LastInputAt) > T155_PR.idleDelayMs) {
    t155Interacting = false;
    t155TargetPR = T155_PR.high;
  }
  const alpha = 1 / T155_PR.rampFrames;
  t155CurrentPR = lerp(t155CurrentPR, t155TargetPR, alpha);
  renderer.setPixelRatio(t155CurrentPR);
}

function refreshPostFXEnabled() {
  if (!composer) return;
  if (ssaoPass) ssaoPass.enabled = !!state.t168Enabled;
  if (bloomPass) bloomPass.enabled = !!state.t159Enabled;
}

function setAOQuality(mode: string) {
  if (!ssaoPass) return;
  if (mode === "screenshot") {
    ssaoPass.kernelRadius = 24;
    ssaoPass.minDistance = 0.002;
    ssaoPass.maxDistance = 0.18;
  } else {
    ssaoPass.kernelRadius = 16;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.12;
  }
}

function setBloom(mode: string) {
  if (!bloomPass) return;
  if (mode === "screenshot") {
    bloomPass.strength = 0.45;
    bloomPass.radius = 0.50;
    bloomPass.threshold = 0.90;
  } else {
    bloomPass.strength = 0.25;
    bloomPass.radius = 0.35;
    bloomPass.threshold = 0.90;
  }
}

function setBeautyMode(on: boolean) {
  beautyMode = !!on;
  const mode = beautyMode ? "screenshot" : "live";
  setAOQuality(mode);
  setBloom(mode);
}

function renderFrameOnce() {
  if (!renderer || !scene || !camera) return;
  const useComposer = composer && (
    (ssaoPass && ssaoPass.enabled) || (bloomPass && bloomPass.enabled)
  );
  if (useComposer) composer.render();
  else renderer.render(scene, camera);
}

async function captureScreenshotBeauty(frames = 3) {
  if (!renderer) return;
  screenshotInProgress = true;

  const prevPR = renderer.getPixelRatio();
  const prevT155 = state.t155Enabled;
  const prevBeauty = beautyMode;

  state.t155Enabled = false;
  renderer.setPixelRatio(T155_PR.high);

  setBeautyMode(true);

  for (let i = 0; i < frames; i++) {
    await new Promise(res => requestAnimationFrame(res));
    renderFrameOnce();
  }

  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "string-theory-lab.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  setBeautyMode(prevBeauty);
  renderer.setPixelRatio(prevPR);
  state.t155Enabled = prevT155;

  screenshotInProgress = false;
}

function hslToRgb(h: number, s: number, l: number) {
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

function paletteColor(t: number, w: number) {
  const mix = (0.3 * t + 0.7 * ((w + 1) / 2));
  let h = 0.65 + 0.35 * mix;
  if (h > 1) h -= 1;
  const [r, g, b] = hslToRgb(h, 0.8, 0.5);
  return [r, g, b];
}

// --- SHAPE GENERATORS ---

function genCloud(n: number, v: number) { const c = 5000 + 1000 * n; const a: any[] = []; for (let i = 0; i < c; i++) { let r = 1.5 * Math.pow(Math.random(), 0.45); let t = Math.random() * Math.PI * 2; let p = Math.acos(2 * Math.random() - 1); a.push({ x: r * Math.sin(p) * Math.cos(t), y: r * Math.sin(p) * Math.sin(t), z: r * Math.cos(p), w: Math.sin((n + 1) * r) * Math.cos(t * (v + 1)), u: r, v: t }); } return a; }
function genKnot(n: number, v: number) { const c = 4000 + 500 * n; const a: any[] = []; const p = 2 + (n % 3), q = 3 + ((n + 1) % 4); for (let i = 0; i < c; i++) { const t = (i / c) * Math.PI * 2 * (p * q); const r = 1.0 + 0.4 * Math.cos(q * t); a.push({ x: r * Math.cos(p * t), y: r * Math.sin(p * t), z: 0.5 * Math.sin(q * t), w: Math.sin((n + 1) * t) + Math.cos(v * t), u: i / c, v: 0 }); } return a; }
function genBrane(n: number, v: number) { const steps = 80 + 10 * n; const a: any[] = []; for (let i = 0; i < steps; i++) { for (let j = 0; j < steps; j++) { const u = i / steps; const V = j / steps; a.push({ x: 3 * (u - 0.5), z: 3 * (V - 0.5), y: 0.5 * Math.sin((n + 1) * u * 4) * Math.cos((v + 1) * V * 4), w: Math.sin(n * (u + V) * 3), u: u, v: V }); } } return a; }
function genFilament(n: number, v: number) { const s = 10 + n; const steps = 200 + 50 * n; const a: any[] = []; for (let k = 0; k < s; k++) { const ang = k / s * Math.PI * 2; for (let i = 0; i < steps; i++) { const t = i / steps; const r = 1.2 + 0.3 * Math.sin((n + 1) * t * 6); a.push({ x: r * Math.cos(ang + t * 4), z: r * Math.sin(ang + t * 4), y: (t - 0.5) * 4, w: Math.sin(n * t * 5 + v * ang), u: t, v: k / s }); } } return a; }
function genShells(n: number, v: number) { const shells = 2 + (n % 4); const a: any[] = []; for (let s = 0; s < shells; s++) { const r = 0.5 + s * 0.6; const c = 1500 + 300 * n; for (let i = 0; i < c; i++) { let t = Math.random() * 6.28; let p = Math.acos(2 * Math.random() - 1); a.push({ x: r * Math.sin(p) * Math.cos(t), y: r * Math.sin(p) * Math.sin(t), z: r * Math.cos(p), w: Math.sin(n * r * 2 + v * t), u: s / shells, v: t }); } } return a; }
function genLattice(n: number, v: number) { const dim = 8 + n; const a: any[] = []; const sp = 3.0 / dim; for (let x = 0; x < dim; x++) for (let y = 0; y < dim; y++) for (let z = 0; z < dim; z++) { if ((x + y + z) % 2 !== 0) continue; a.push({ x: (x - dim / 2) * sp, y: (y - dim / 2) * sp, z: (z - dim / 2) * sp, w: Math.sin(n * (x + y + z) * 0.5) * Math.cos(v * x), u: x / dim, v: y / dim }); } return a; }
function genBloom(n: number, v: number) { const petals = 4 + (n % 5); const c = 4000 + 600 * n; const a: any[] = []; for (let i = 0; i < c; i++) { const t = i / c; const r = 0.2 + 2.5 * t; const th = t * 6.28 * petals + 0.5 * Math.sin(v * t * 5); a.push({ x: r * Math.cos(th), z: r * Math.sin(th), y: 0.5 * Math.sin(n * t * 8), w: Math.sin((n + 1) * t * 4), u: t, v: 0 }); } return a; }
function genStorm(n: number, v: number) { const arms = 3 + (n % 4); const c = 5000 + 600 * n; const a: any[] = []; for (let i = 0; i < c; i++) { const t = i / c; const r = 0.1 + 3 * t; const th = t * 10 + (Math.PI * 2 / arms) * Math.floor(Math.random() * arms); a.push({ x: r * Math.cos(th), z: r * Math.sin(th), y: (Math.random() - 0.5) * t, w: Math.sin(n * t * 5) * Math.cos(v * th), u: t, v: 0 }); } return a; }
function genOrbital(n: number, v: number) { const rings = 3 + (n % 3); const a: any[] = []; for (let r = 0; r < rings; r++) { const rad = 1 + r * 0.6; const c = 1500 + 300 * n; const ax = (Math.random() - 0.5), az = (Math.random() - 0.5); for (let i = 0; i < c; i++) { const t = i / c * 6.28; let x = rad * Math.cos(t), z = rad * Math.sin(t), y = 0; let ty = y * Math.cos(ax) - z * Math.sin(ax); z = y * Math.sin(ax) + z * Math.cos(ax); y = ty; a.push({ x, y, z, w: Math.sin(n * t + v * r), u: t, v: r }); } } return a; }
function genFractal(n: number, v: number) { const nodes = 150 + 30 * n; const a: any[] = []; for (let i = 0; i < nodes; i++) { let rx = (Math.random() - 0.5) * 3, ry = (Math.random() - 0.5) * 3, rz = (Math.random() - 0.5) * 3; for (let j = 0; j < 3; j++) { let tx = rx + (Math.random() - 0.5), ty = ry + (Math.random() - 0.5), tz = rz + (Math.random() - 0.5); for (let k = 0; k < 20; k++) { let t = k / 20; a.push({ x: lerp(rx, tx, t), y: lerp(ry, ty, t), z: lerp(rz, tz, t), w: Math.sin(n * t * 4) * Math.cos(v * i), u: t, v: i / nodes }); } } } return a; }
function genStarburst(n: number, v: number) { const rays = 40 + 10 * n; const a: any[] = []; for (let i = 0; i < rays; i++) { const phi = Math.acos(2 * Math.random() - 1), th = Math.random() * 6.28; const dx = Math.sin(phi) * Math.cos(th), dy = Math.sin(phi) * Math.sin(th), dz = Math.cos(phi); for (let j = 0; j < 40; j++) { const t = j / 40; const r = 3 * t; a.push({ x: dx * r, y: dy * r, z: dz * r, w: Math.sin((n + 2) * t * 4 + v * i), u: t, v: i / rays }); } } return a; }
function genBinary(n: number, v: number) { const a: any[] = []; [-1.2, 1.2].forEach(ox => { const c = 2000 + 400 * n; for (let i = 0; i < c; i++) { const r = 0.1 + 1.2 * Math.random(); const th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1); a.push({ x: ox + r * Math.sin(ph) * Math.cos(th), y: r * Math.sin(ph) * Math.sin(th), z: r * Math.cos(ph), w: Math.sin(n * r * 3 + v), u: r, v: 0 }); } }); return a; }
function genTerrace(n: number, v: number) { const layers = 5 + Math.floor(n / 2); const a: any[] = []; for (let l = 0; l < layers; l++) { const y = (l - layers / 2) * 0.5; const r = 0.5 + l * 0.3; const c = 800 + 200 * n; for (let i = 0; i < c; i++) { const t = i / c * 6.28; a.push({ x: r * Math.cos(t), y: y + (Math.random() - 0.5) * 0.1, z: r * Math.sin(t), w: Math.sin(n * t + v * l), u: t, v: l }); } } return a; }
function genRibbon(n: number, v: number) { const len = 200 + 50 * n; const width = 15; const a: any[] = []; for (let i = 0; i < len; i++) { const t = i / len; const x = 1.5 * Math.cos(t * 6.28 * 3), z = 1.5 * Math.sin(t * 6.28 * 3), y = (t - 0.5) * 4; for (let j = 0; j < width; j++) { const wt = (j - width / 2) * 0.05; a.push({ x: x, y: y + wt, z: z, w: Math.sin(n * t * 10 + v * j), u: t, v: j / width }); } } return a; }
function genSpine(n: number, v: number) { const len = 100 + 20 * n; const a: any[] = []; for (let i = 0; i < len; i++) { const t = i / len; const y = (t - 0.5) * 4; for (let j = 0; j < 10; j++) { const ang = j / 10 * 6.28; const r = 0.5 + 0.3 * Math.sin(t * 20); a.push({ x: r * Math.cos(ang), y: y, z: r * Math.sin(ang), w: Math.sin(n * t * 5 + v * ang), u: t, v: j / 10 }); } } return a; }
function genCity(n: number, v: number) { const grid = 5 + Math.floor(n / 2); const a: any[] = []; const sp = 3.0 / grid; for (let x = 0; x < grid; x++) for (let z = 0; z < grid; z++) { const h = 0.5 + Math.random() * 1.5; const c = 50 + 10 * n; for (let i = 0; i < c; i++) { const y = (i / c) * h; a.push({ x: (x - grid / 2) * sp, y: y - 0.5, z: (z - grid / 2) * sp, w: Math.sin(n * y * 4 + v * x), u: y, v: 0 }); } } return a; }
function genShard(n: number, v: number) { const shards = 10 + n * 2; const a: any[] = []; for (let s = 0; s < shards; s++) { const cx = (Math.random() - 0.5) * 3, cy = (Math.random() - 0.5) * 3, cz = (Math.random() - 0.5) * 3; for (let i = 0; i < 100; i++) { const t = i / 100; a.push({ x: cx + t * 0.5, y: cy + t * 0.8, z: cz, w: Math.sin(n * t * 5 + v * s), u: t, v: 0 }); } } return a; }

function genGalaxy(n: number, v: number) {
  const arms = 2 + (n % 3);
  const __qp = (window.NexusPrefs && window.NexusPrefs.qualityProfile) ? window.NexusPrefs.qualityProfile() : { particleScale: 1 as number };
  const count = Math.max(2000, Math.round((6000 + 500 * n) * (Number(__qp.particleScale) || 1)));

  const arr: any[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const armOffset = Math.floor(Math.random() * arms) / arms * Math.PI * 2;
    const r = 0.2 + t * 3.0;
    const theta = armOffset + 3.0 * Math.log(1 + r) + (Math.random() - 0.5) * 0.5;
    arr.push({
      x: r * Math.cos(theta), y: (Math.random() - 0.5) * 0.2 * (1 - t), z: r * Math.sin(theta),
      w: Math.sin((n + 2) * t * Math.PI) * Math.cos(v * theta), u: t, v: theta
    });
  }
  return arr;
}

function genTesseract(n: number, v: number) {
  const layers = 3 + (n % 4);
  const arr: any[] = [];
  const size = 1.5;
  for (let l = 0; l < layers; l++) {
    const s = size * (0.5 + 0.5 * (l / layers));
    const steps = 200 + 50 * n;
    const edges = [
      [-s, -s, -s, s, -s, -s], [-s, -s, -s, -s, s, -s], [-s, -s, -s, -s, -s, s], [s, s, s, -s, s, s], [s, s, s, s, -s, s], [s, s, s, s, s, -s],
      [-s, s, -s, s, s, -s], [s, -s, -s, s, s, -s], [-s, -s, s, s, -s, s], [-s, -s, s, -s, s, s], [-s, s, -s, -s, s, s], [s, -s, -s, s, -s, s]
    ];
    edges.forEach(e => {
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const x = lerp(e[0], e[3], t), y = lerp(e[1], e[4], t), z = lerp(e[2], e[5], t);
        arr.push({ x, y, z, w: Math.sin((n + 1) * t * Math.PI * 2 + l) * Math.cos(v * x), u: t, v: l / layers });
      }
    });
  }
  return arr;
}

function genTree(n: number, v: number) {
  const arr: any[] = [];
  function b(x: number, y: number, z: number, l: number, ax: number, az: number, d: number) {
    if (d <= 0) return; const st = 8 + 2 * n;
    for (let i = 0; i < st; i++) { const t = i / st; arr.push({ x: x + Math.sin(ax) * Math.cos(az) * l * t, y: y + Math.cos(ax) * l * t, z: z + Math.sin(ax) * Math.sin(az) * l * t, w: Math.sin(d + n * t + v), u: t, v: d }); }
    const nx = x + Math.sin(ax) * Math.cos(az) * l, ny = y + Math.cos(ax) * l, nz = z + Math.sin(ax) * Math.sin(az) * l;
    b(nx, ny, nz, l * 0.7, ax + 0.6, az + 1, d - 1); b(nx, ny, nz, l * 0.7, ax - 0.6, az - 1, d - 1);
  }
  b(0, -1.5, 0, 1.2, 0, 0, 3 + (n % 4)); return arr;
}

function genBraid(n: number, v: number) { const strands = 3 + (v % 2), turns = 3 + Math.max(0, n - 3), steps = 600 + 120 * Math.max(0, n - 3), radius = 0.9 + 0.1 * v, arr: any[] = []; for (let i = 0; i < steps; i++) { const t = i / (steps - 1), y = (t - 0.5) * 3.0, sx = 0.2 * Math.sin((n * 0.7 + v) * t * 6.28), sz = 0.2 * Math.cos((n * 0.5 + v) * t * 6.28); arr.push({ x: sx, y: y, z: sz, w: 0.6 * Math.sin((n + 1.1) * t * 4), u: t, v: 0 }); for (let s = 0; s < strands; s++) { const ph = s / strands * 6.28, th = t * 6.28 * turns + ph; arr.push({ x: sx + radius * Math.cos(th), y: y + 0.05 * Math.sin(th * 2 + s), z: sz + radius * Math.sin(th), w: 0.9 * Math.sin((n + s + 1.7) * t * 4), u: t, v: (s + 1) / strands }); } } return arr; }
function genOrigami(n: number, v: number) { const sheets = 4 + (n % 3) + v, folds = 10 + 4 * Math.max(0, n - 3), arr: any[] = []; for (let s = 0; s < sheets; s++) { const ang = -0.8 + (1.6 * s) / Math.max(1, sheets - 1), tilt = 0.15 * (s - (sheets - 1) / 2); for (let i = 0; i <= folds; i++) { const u = i / folds, phase = u * Math.PI * (folds / 2), off = (Math.sin(phase) > 0 ? 1 : -1) * 0.15; for (let j = 0; j <= 20; j++) { const val = j / 20, xl = (val - 0.5) * 1.8, zl = (u - 0.5) * 3.0, yl = off * (1 - Math.abs(val - 0.5) * 1.6); arr.push({ x: xl * Math.cos(ang) - zl * Math.sin(ang), z: xl * Math.sin(ang) + zl * Math.cos(ang), y: yl + tilt, w: 0.7 * Math.sin((n + 2.3) * u * 4 + s), u: u, v: s }); } } } return arr; }
function genCage(n: number, v: number) { const t = (1 + Math.sqrt(5)) / 2, verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(p => { const m = Math.sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2); return [p[0] / m, p[1] / m, p[2] / m] as number[]; }), edges = [[0, 1], [0, 5], [0, 7], [0, 10], [0, 11], [1, 5], [1, 7], [1, 8], [1, 9], [2, 3], [2, 4], [2, 6], [2, 10], [2, 11], [3, 4], [3, 6], [3, 8], [3, 9], [4, 5], [4, 9], [4, 11], [5, 9], [5, 11], [6, 7], [6, 8], [6, 10], [7, 8], [7, 10], [8, 9], [10, 11]], arr: any[] = []; for (let l = 0; l < 3 + Math.max(0, n - 3); l++) { const sc = 0.7 + (l / (2 + n - 3)) * (1.1), wp = l * 6.28; edges.forEach(e => { const v1 = verts[e[0]], v2 = verts[e[1]]; for (let i = 0; i <= 20; i++) { const t = i / 20; arr.push({ x: (v1[0] + (v2[0] - v1[0]) * t) * sc, y: (v1[1] + (v2[1] - v1[1]) * t) * sc, z: (v1[2] + (v2[2] - v1[2]) * t) * sc, w: Math.sin(n * t * 4 + wp), u: t, v: sc }); } }); } return arr; }
function genMobius(n: number, v: number) { const seg = 260 + 40 * Math.max(0, n - 3), wid = 0.5 + 0.1 * v, arr: any[] = []; for (let i = 0; i <= seg; i++) { const u = i / seg, th = u * 6.28, tw = th / 2; for (let j = 0; j <= 24; j++) { const val = (j / 24) * 2 - 1, wl = (val * wid) / 2; arr.push({ x: (1.6 + wl * Math.cos(tw)) * Math.cos(th), z: (1.6 + wl * Math.cos(tw)) * Math.sin(th), y: wl * Math.sin(tw), w: 0.9 * Math.sin((n + 2.7) * u * 4 + val * 3), u: u, v: (val + 1) / 2 }); } } return arr; }
function genFaults(n: number, v: number) { const g = 15 + 4 * Math.max(0, n - 3), arr: any[] = []; for (let x = 0; x < g; x++) for (let z = 0; z < g; z++) { const p = ((x * 7385 ^ z * 19349) >>> 0) % 10, dy = (Math.random() - 0.5) * 0.6; for (let j = 0; j < 4; j++) { const u = x / (g - 1), v = z / (g - 1); arr.push({ x: u * 3 - 1.5, z: v * 3 - 1.5, y: dy, w: Math.sin((n + 1.8) * (u + v) * 4), u: u, v: v }); } } return arr; }

// --- EXTREME STRUCTURE GENERATORS (Categories 1–8) ---

function _hash32(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function _rng32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }
function _lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function _smoothstep(a: number, b: number, x: number) {
  const t = _clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function _rot2(x: number, y: number, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [c * x - s * y, s * x + c * y];
}
function _noise3(x: number, y: number, z: number, seed: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 0.001) * 43758.5453;
  return s - Math.floor(s);
}
function _gauss(rng: () => number) {
  let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function _genExtremeCore(kind: string, preset: string, n: number, v: number, mix4D: number, densityScale: number) {
  const seed = _hash32(kind + "::" + preset) ^ (n * 1315423911) ^ (v * 2654435761);
  const rng = _rng32(seed >>> 0);

  const count = Math.floor((5200 + 1300 * n) * _clamp(densityScale || 1, 0.2, 3.0));
  const pts = new Array(count);

  const h = _hash32(preset);
  const flavorA = ((h >>> 8) & 255) / 255;
  const flavorB = ((h >>> 16) & 255) / 255;
  const flavorC = ((h >>> 24) & 255) / 255;
  const warp = 0.25 + 0.85 * mix4D;
  const sBase = 1.0 + 0.25 * (n - 5);

  function accept(prob: number) { return rng() < prob; }

  let webNodes: any[] | null = null, webEdges: number[][] | null = null;
  if (kind === "pqweb") {
    const nodeCount = 8 + Math.floor(n * 1.5);
    webNodes = [];
    for (let i = 0; i < nodeCount; i++) {
      webNodes.push({ x: _gauss(rng) * 0.9, y: _gauss(rng) * 0.9, z: _gauss(rng) * 0.9, q: (rng() * 2 - 1), p: (rng() * 2 - 1) });
    }
    webEdges = [];
    const hubIdx = Math.floor(rng() * nodeCount);
    const edgesTarget = Math.floor(nodeCount * 1.4 + n * 2);
    for (let e = 0; e < edgesTarget; e++) {
      let a: number, b: number;
      if (preset.includes("hub")) { a = hubIdx; b = Math.floor(rng() * nodeCount); }
      else if (preset.includes("filament")) { a = Math.floor(rng() * nodeCount); b = (a + 1 + Math.floor(rng() * 3)) % nodeCount; }
      else { a = Math.floor(rng() * nodeCount); b = Math.floor(rng() * nodeCount); }
      if (a === b) b = (b + 1) % nodeCount;
      webEdges.push([a, b]);
    }
  }

  function torusKnot(t: number, p: number, q: number) {
    const R = 1.35, r = 0.55;
    const a = 2 * Math.PI * t;
    const x = (R + r * Math.cos(q * a)) * Math.cos(p * a);
    const y = (R + r * Math.cos(q * a)) * Math.sin(p * a);
    const z = r * Math.sin(q * a);
    return [x, y, z];
  }

  function fTPMS(x: number, y: number, z: number, k: number) {
    return Math.sin(k * x) * Math.cos(k * y) + Math.sin(k * y) * Math.cos(k * z) + Math.sin(k * z) * Math.cos(k * x);
  }

  function fPoly(x: number, y: number, z: number, k: number) {
    const a = Math.sin(k * x) + Math.sin(k * y) + Math.sin(k * z);
    const b = Math.sin(k * (x + y)) + Math.sin(k * (y + z)) + Math.sin(k * (z + x));
    return 0.6 * a + 0.4 * b;
  }

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0, w = 0, u = 0, aux = 0;

    if (kind === "tfold") {
      const k = 2 + (n | 0);
      x = (rng() * 2 - 1);
      y = (rng() * 2 - 1);
      z = (rng() * 2 - 1);

      const method = (v | 0) % 3;
      let cellId = 0, seam = 0;

      if (method === 0) {
        const gx = Math.floor((x + 1) * 0.5 * k);
        const gy = Math.floor((y + 1) * 0.5 * k);
        const gz = Math.floor((z + 1) * 0.5 * k);
        cellId = gx + k * (gy + k * gz);
        const fx = ((x + 1) * 0.5 * k) - gx;
        const fy = ((y + 1) * 0.5 * k) - gy;
        const fz = ((z + 1) * 0.5 * k) - gz;
        seam = Math.min(fx, 1 - fx, fy, 1 - fy, fz, 1 - fz);
      } else if (method === 1) {
        const cN = 6 + (n % 5);
        let best = 1e9, bestId = 0;
        for (let j = 0; j < cN; j++) {
          const cx = (Math.sin((j + 1) * 12.1 + seed * 0.001) * 0.5);
          const cy = (Math.sin((j + 1) * 27.7 + seed * 0.002) * 0.5);
          const cz = (Math.sin((j + 1) * 41.3 + seed * 0.003) * 0.5);
          const dx = x - cx, dy = y - cy, dz = z - cz;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < best) { best = d; bestId = j; }
        }
        cellId = bestId;
        seam = _clamp(Math.sqrt(best), 0, 1);
      } else {
        const nv = _noise3(x * 3, y * 3, z * 3, seed);
        cellId = Math.floor(nv * (6 + n));
        seam = Math.abs(nv - 0.5);
      }

      const flip = ((cellId + (v | 0)) & 1) ? -1 : 1;
      const perm = (cellId + (v | 0)) % 3;
      let X = x, Y = y, Z = z;
      if (perm === 1) { X = y; Y = z; Z = x; }
      else if (perm === 2) { X = z; Y = x; Z = y; }

      const sharp = preset.includes("shatter") ? 1.35 : (preset.includes("hyperwarp") ? 1.15 : 1.0);
      const seamBoost = preset.includes("seam_foam") ? 1.6 : (preset.includes("duality") ? 1.2 : 1.0);

      const ang = (flavorA * 2 - 1) * Math.PI * 0.25 * warp;
      const rxy = _rot2(X, Y, ang);
      X = rxy[0]; Y = rxy[1];
      Z = Z + (flip * (flavorB - 0.5) * 0.45 * warp);

      if (preset.includes("retile")) {
        const j = _noise3(X * 4, Y * 4, Z * 4, seed + cellId * 17);
        if (j > 0.72) { X = -X; Y = Y * flip; Z = -Z; }
      }

      if (preset.includes("flip_lock")) {
        const t = _smoothstep(0.25, 0.75, Math.abs(Z));
        X = _lerp(X, Math.sign(X) * Math.abs(X), t);
        Y = _lerp(Y, Math.sign(Y) * Math.abs(Y), t);
      }

      x = X * (1.0 + 0.15 * (n - 5));
      y = Y * (1.0 + 0.15 * (n - 5));
      z = Z * (1.0 + 0.15 * (n - 5));

      const seamIntensity = Math.pow(1 - _clamp(seam, 0, 1), 1.2 * sharp) * seamBoost;
      w = flip * (0.6 * seamIntensity + 0.4 * Math.sin((v + 1) * 3 * (X + Y + Z)));
      u = cellId;
      aux = seam;

      if (!accept(_clamp(0.25 + 0.75 * seamIntensity, 0, 1))) {
        x += (rng() - 0.5) * 0.15; y += (rng() - 0.5) * 0.15; z += (rng() - 0.5) * 0.15;
      }
    }

    else if (kind === "orientifold") {
      x = _gauss(rng) * 0.9; y = _gauss(rng) * 0.9; z = _gauss(rng) * 0.9;
      const planeCount = preset.includes("kaleido") ? (3 + Math.floor(n / 2)) : 1;
      let px = x, py = y, pz = z;
      for (let pI = 0; pI < planeCount; pI++) {
        const ang = (pI + 1 + v * 0.2) * (0.6 + 0.5 * flavorA);
        const nx = Math.cos(ang) * Math.cos(ang * 0.7);
        const ny = Math.sin(ang) * Math.cos(ang * 0.7);
        const nz = Math.sin(ang * 0.7);
        const off = 0.15 * (flavorB - 0.5);
        const d = (px * nx + py * ny + pz * nz) - off;

        const hard = preset.includes("hard");
        const band = preset.includes("soft") ? (0.25 + 0.2 * flavorC) : 0.05;

        if (hard) {
          if (d > 0) {
            px = px - 2 * d * nx;
            py = py - 2 * d * ny;
            pz = pz - 2 * d * nz;
            w *= -1;
          }
        } else {
          const t = _smoothstep(0, band, Math.abs(d));
          const rx = px - 2 * d * nx, ry = py - 2 * d * ny, rz = pz - 2 * d * nz;
          const blend = 1 - t;
          px = _lerp(px, rx, blend);
          py = _lerp(py, ry, blend);
          pz = _lerp(pz, rz, blend);
        }

        if (preset.includes("kaleido") && (pI % 2 === 0)) w *= -1;
      }

      if (preset.includes("twisted")) {
        const ramp = (Math.atan2(py, px) / (2 * Math.PI) + 0.5);
        const twist = 2 * Math.PI * (0.5 + 0.25 * n) * ramp;
        const r = _rot2(px, py, twist);
        px = r[0]; py = r[1];
        w = Math.sin(twist) * (0.6 + 0.4 * mix4D);
      } else {
        w = Math.tanh(px * py - pz * 0.5) * (0.8 + 0.2 * mix4D);
      }

      x = px * sBase * 0.85; y = py * sBase * 0.85; z = pz * sBase * 0.85;
      u = planeCount;
      aux = 0;
    }

    else if (kind === "conifold") {
      const t = rng() * 2 - 1;
      const ang = rng() * Math.PI * 2;
      const basePinch = preset.includes("epsilon") ? 0.045 : 0.09;
      let pinch = basePinch * (1.0 / (1 + 0.12 * n)) * (0.7 + 0.6 * flavorA);

      let cx = 0, cy = 0;
      const branches = preset.includes("branch") ? (2 + Math.floor(n / 3)) : 1;
      const b = Math.floor(rng() * branches);
      const bAng = (b / branches) * Math.PI * 2;
      const bRad = preset.includes("branch") ? (0.35 + 0.25 * flavorB) : 0;
      cx = Math.cos(bAng) * bRad;
      cy = Math.sin(bAng) * bRad;

      let zAxis = t;
      let loop = 0;
      if (preset.includes("loop")) {
        const loopR = 0.7 + 0.25 * flavorC;
        const a = (t * 0.5 + 0.5) * Math.PI * 2;
        cx += Math.cos(a) * loopR;
        cy += Math.sin(a) * loopR;
        zAxis = Math.sin(a) * 0.25;
        loop = 1;
      }

      let prof: number;
      if (preset.includes("long")) prof = 0.12 + 0.55 * Math.pow(Math.abs(t), 0.7);
      else if (preset.includes("resolved")) prof = 0.18 + 0.45 * Math.pow(Math.abs(t), 0.85);
      else prof = 0.10 + 0.50 * Math.pow(Math.abs(t), 0.6);

      const r0 = Math.max(pinch, prof);
      const r = r0 + (rng() - 0.5) * 0.08;
      x = cx + Math.cos(ang) * r;
      y = cy + Math.sin(ang) * r;
      z = zAxis * (1.6 + 0.2 * n) + (rng() - 0.5) * 0.08;

      if (preset.includes("mode_mixing")) {
        const band = Math.sin((v + 1) * 3 * (t + 1)) * 0.5 + 0.5;
        const rr = _rot2(x, y, band * Math.PI * 0.6);
        x = rr[0]; y = rr[1];
        w = (band * 2 - 1) * (0.8 + 0.2 * mix4D);
      } else {
        w = (1.0 / (0.15 + r0)) * 0.25 * (0.8 + 0.4 * mix4D);
      }

      if (preset.includes("flux")) {
        const sp = (0.8 + 0.2 * n) * (0.6 + 0.6 * flavorB);
        x += 0.12 * Math.cos(sp * z + ang);
        y += 0.12 * Math.sin(sp * z + ang);
        w *= 1.15;
      }

      u = branches + loop;
      aux = r0;
    }

    else if (kind === "branes") {
      const sheets = 3 + Math.floor(n / 2) + (preset.includes("foam") ? 3 : 0);
      x = (rng() * 2 - 1) * 1.2;
      y = (rng() * 2 - 1) * 1.2;
      z = (rng() * 2 - 1) * 1.2;

      let score = 0;
      for (let s = 0; s < sheets; s++) {
        const ang = (s + 1) * 1.7 + 0.4 * v;
        const nx = Math.cos(ang);
        const ny = Math.sin(ang * 0.9);
        const nz = Math.sin(ang) * 0.8;
        const off = (rng() - 0.5) * 0.4;

        const warpN = (preset.includes("tangled") || preset.includes("foam")) ? 0.25 : 0.12;
        const field = (x * nx + y * ny + z * nz) - off
          + warpN * Math.sin((x + y + z) * (1.6 + 0.2 * n) + s * 2.1 + v);

        score += Math.abs(field);
      }

      const thresh = preset.includes("open_string") ? 0.55 : (preset.includes("percolation") ? 0.85 : 0.70);
      const prob = _clamp(1.0 - (score / (thresh * sheets)), 0, 1);

      if (preset.includes("collision")) {
        const t = Math.sin((v + 1) * 0.8 + z * 2.0);
        x += 0.25 * t;
        w = t * (0.9 + 0.3 * mix4D);
      } else {
        w = (prob * 2 - 1) * (0.8 + 0.2 * mix4D);
      }

      if (!accept(0.15 + 0.85 * prob)) {
        x *= 0.85; y *= 0.85; z *= 0.85;
      }

      if (preset.includes("moire")) {
        z *= 0.55;
        w *= 1.2;
      }

      u = sheets;
      aux = score;
    }

    else if (kind === "pqweb") {
      const eId = Math.floor(rng() * webEdges!.length);
      const a = webEdges![eId][0], b = webEdges![eId][1];
      const A = webNodes![a], B = webNodes![b];

      const t = rng();
      const mx = (A.x + B.x) * 0.5 + (rng() - 0.5) * 0.35;
      const my = (A.y + B.y) * 0.5 + (rng() - 0.5) * 0.35;
      const mz = (A.z + B.z) * 0.5 + (rng() - 0.5) * 0.35;

      x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * mx + t * t * B.x;
      y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * my + t * t * B.y;
      z = (1 - t) * (1 - t) * A.z + 2 * (1 - t) * t * mz + t * t * B.z;

      const tension = preset.includes("tension") ? Math.sqrt(A.p * A.p + A.q * A.q) : (0.3 + 0.9 * Math.abs(A.p - B.p));
      const jitter = preset.includes("frustrated") ? (rng() - 0.5) * 0.12 : (rng() - 0.5) * 0.04;

      if (preset.includes("filament")) {
        x += jitter; y += jitter; z += jitter;
        w = (tension * 2 - 1) * (0.6 + 0.4 * mix4D);
      } else {
        w = (Math.sin((v + 1) * 6 * t + tension * 3) + jitter) * (0.7 + 0.3 * mix4D);
      }

      u = eId;
      aux = tension;

      if (preset.includes("orientifold")) {
        if (x > 0) { x = -x; w *= -1; }
      }
    }

    else if (kind === "holo") {
      const boundary = (v | 0) % 3;
      let bx = 0, by = 0, bz = 0;
      if (boundary === 0) {
        const th = rng() * Math.PI * 2;
        const ph = Math.acos(2 * rng() - 1);
        bx = Math.cos(th) * Math.sin(ph);
        by = Math.sin(th) * Math.sin(ph);
        bz = Math.cos(ph);
      } else if (boundary === 1) {
        bx = (rng() * 2 - 1); by = (rng() * 2 - 1); bz = (rng() * 2 - 1);
        const m = Math.max(Math.abs(bx), Math.abs(by), Math.abs(bz));
        bx /= m; by /= m; bz /= m;
      } else {
        const th = rng() * Math.PI * 2;
        const ph = Math.acos(2 * rng() - 1);
        const rr = 1 + 0.25 * Math.sin((v + 1) * 3 * th + n);
        bx = rr * Math.cos(th) * Math.sin(ph);
        by = rr * Math.sin(th) * Math.sin(ph);
        bz = rr * Math.cos(ph);
      }

      const sig = _noise3(bx * 6, by * 6, bz * 6, seed) * 2 - 1;

      let depth = rng();
      if (preset.includes("skin")) depth = depth * depth * 0.15;
      if (preset.includes("decode")) depth = Math.pow(depth, 0.35);
      if (preset.includes("glyph")) depth = Math.pow(depth, 0.25);
      if (preset.includes("turb")) depth = Math.pow(depth, 0.55);

      if (preset.includes("standing_wave")) {
        const shells = 4 + Math.floor(n / 2);
        const s = Math.round(depth * shells) / shells;
        depth = s;
      }

      if (preset.includes("bridge")) {
        const th2 = rng() * Math.PI * 2;
        const ph2 = Math.acos(2 * rng() - 1);
        const bx2 = Math.cos(th2) * Math.sin(ph2);
        const by2 = Math.sin(th2) * Math.sin(ph2);
        const bz2 = Math.cos(ph2);
        const t = rng();
        bx = _lerp(bx, bx2, t);
        by = _lerp(by, by2, t);
        bz = _lerp(bz, bz2, t);
        depth = _smoothstep(0, 1, depth);
      }

      x = bx * (1 - depth) * 1.65;
      y = by * (1 - depth) * 1.65;
      z = bz * (1 - depth) * 1.65;

      if (preset.includes("anisotropic")) {
        const ax = (v | 0) % 3;
        if (ax === 0) x *= 1.8;
        if (ax === 1) y *= 1.8;
        if (ax === 2) z *= 1.8;
      }

      if (preset.includes("phase_flip")) {
        const s = sig > 0 ? 1 : -1;
        x *= 1 + 0.25 * s;
        y *= 1 - 0.15 * s;
        w = s * (0.9 + 0.3 * mix4D);
      } else {
        w = sig * (0.9 + 0.3 * mix4D);
      }

      u = boundary;
      aux = depth;
    }

    else if (kind === "flux") {
      const strands = 6 + Math.floor(n * 2);
      const sId = Math.floor(rng() * strands);
      const t = rng();

      let cx = 0, cy = 0, cz = 0;

      if (preset.includes("hopf")) {
        const phi = (sId / strands) * Math.PI * 2;
        const ang = 2 * Math.PI * t;
        const R = 1.05, r = 0.55;
        cx = R * Math.cos(phi) + r * Math.cos(ang) * Math.cos(phi + Math.PI / 2);
        cy = R * Math.sin(phi) + r * Math.cos(ang) * Math.sin(phi + Math.PI / 2);
        cz = r * Math.sin(ang);
      } else if (preset.includes("trefoil")) {
        const k = torusKnot(t, 2, 3); cx = k[0]; cy = k[1]; cz = k[2];
      } else if (preset.includes("figure8")) {
        const k = torusKnot(t, 3, 4); cx = k[0]; cy = k[1]; cz = k[2];
      } else {
        const ang = 2 * Math.PI * t;
        const R = 1.55;
        cx = R * Math.cos(ang); cy = R * Math.sin(ang); cz = 0;
      }

      let braidTurns = 2 + Math.floor(n / 2);
      if (preset.includes("superbraid")) braidTurns += 3;
      if (preset.includes("fractal")) braidTurns += 4;
      const theta = 2 * Math.PI * (braidTurns * t + sId / strands);

      const rad = 0.12 + 0.14 * (preset.includes("superbraid") ? 1 : 0) + 0.08 * flavorA;
      let ox = Math.cos(theta) * rad;
      let oy = Math.sin(theta) * rad;
      let oz = (Math.sin(theta * 0.5) * 0.06);

      if (preset.includes("chirality")) {
        const flip = (((Math.floor(t * 8) + sId) & 1) ? -1 : 1);
        ox *= flip; oy *= -flip;
        w = flip * (0.9 + 0.3 * mix4D);
      }

      if (preset.includes("snarl") || preset.includes("collapse")) {
        const j = (rng() - 0.5) * (preset.includes("collapse") ? 0.28 : 0.18);
        oz += j;
      }

      if (preset.includes("shockwave")) {
        const pulse = Math.sin((v + 1) * 2.0 + t * 2 * Math.PI * (2 + n / 3));
        ox *= 1 + 0.45 * _clamp(pulse, -1, 1);
        w = pulse * (0.9 + 0.3 * mix4D);
      }

      if (preset.includes("pump")) {
        const pump = Math.sin((v + 1) * 1.3 + t * 2 * Math.PI);
        oz += pump * 0.18;
        w = pump * (0.9 + 0.3 * mix4D);
      }

      if (preset.includes("boundary_coupled")) {
        const sig = _noise3(cx * 2, cy * 2, cz * 2, seed + 999);
        const sVal = (sig > 0.5) ? 1 : -1;
        ox *= 1 + 0.35 * sVal;
        oy *= 1 - 0.15 * sVal;
        w = sVal * (0.9 + 0.3 * mix4D);
      }

      x = (cx + ox) * 1.05;
      y = (cy + oy) * 1.05;
      z = (cz + oz) * 1.05;

      if (!preset.includes("shockwave") && !preset.includes("pump") && !preset.includes("chirality")) {
        w = Math.sin(theta + (v + 1) * 0.7) * (0.75 + 0.35 * mix4D);
      }

      u = sId;
      aux = t;
    }

    else if (kind === "amoeba") {
      x = (rng() * 2 - 1) * 1.2;
      y = (rng() * 2 - 1) * 1.2;
      z = (rng() * 2 - 1) * 1.2;

      const k = (2.5 + 0.35 * n) * (preset.includes("triply") ? 1.25 : 1.0);
      const iso = preset.includes("swiss") ? 0.15 : 0.0;
      const eps = preset.includes("near_singular") ? 0.06 : 0.09;

      let f = 0;
      if (preset.includes("triply")) {
        f = fTPMS(x, y, z, k);
      } else if (preset.includes("polynomial")) {
        f = fPoly(x, y, z, k);
      } else {
        f = 0.7 * fTPMS(x, y, z, k * 0.85) + 0.3 * fPoly(x, y, z, k * 1.05);
      }

      const gBoost = preset.includes("high_genus") || preset.includes("handles") ? 1.2 : 1.0;
      const band = eps / gBoost;

      const dist = Math.abs(f - iso);
      const prob = _clamp(1.0 - dist / band, 0, 1);

      if (!accept(0.15 + 0.85 * prob)) {
        x *= 0.75; y *= 0.75; z *= 0.75;
      }

      if (preset.includes("cusp") || preset.includes("crease") || preset.includes("spiky")) {
        const sp = (1.0 - prob);
        x += Math.sign(x) * sp * 0.22;
        y += Math.sign(y) * sp * 0.22;
        z += Math.sign(z) * sp * 0.22;
      }

      if (preset.includes("foam") || preset.includes("percolated")) {
        const nv = _noise3(x * 4, y * 4, z * 4, seed + 1234);
        x += (nv - 0.5) * 0.18;
        y += (nv - 0.5) * 0.18;
      }

      if (preset.includes("mirrored")) {
        if (x > 0) { x = -x; w *= -1; }
      }

      if (preset.includes("conifold")) {
        const r = Math.sqrt(x * x + y * y);
        const pinch = 0.10 + 0.04 * Math.abs(z);
        x *= (pinch / (0.2 + r));
        y *= (pinch / (0.2 + r));
      }
      if (preset.includes("brane_pierced")) {
        const cut = Math.sin((v + 1) * 1.1 + x * 3) * Math.cos((v + 1) * 0.9 + y * 3);
        z += cut * 0.22;
      }
      if (preset.includes("holographic")) {
        const enc = Math.sin(x * k * 0.6) * Math.sin(y * k * 0.6);
        w = enc * (0.9 + 0.3 * mix4D);
      } else {
        w = (prob * 2 - 1) * (0.85 + 0.35 * mix4D);
      }

      u = 0;
      aux = f;
    }

    pts[i] = { x: x, y: y, z: z, w: w, u: u, v: aux };
  }

  return pts;
}

function genTFoldExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("tfold", preset, n, v, mix4D, densityScale); }
function genOrientifoldExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("orientifold", preset, n, v, mix4D, densityScale); }
function genConifoldExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("conifold", preset, n, v, mix4D, densityScale); }
function genBranesExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("branes", preset, n, v, mix4D, densityScale); }
function genPQWebExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("pqweb", preset, n, v, mix4D, densityScale); }
function genHoloExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("holo", preset, n, v, mix4D, densityScale); }
function genFluxExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("flux", preset, n, v, mix4D, densityScale); }
function genAmoebaExtreme(preset: string, n: number, v: number, mix4D: number, densityScale: number) { return _genExtremeCore("amoeba", preset, n, v, mix4D, densityScale); }

function generatePoints(shape: string, n: number, v: number) {
  const generators: Record<string, (n: number, v: number) => any[]> = {
    cloud: genCloud, knot: genKnot, brane: genBrane, filament: genFilament, shells: genShells, lattice: genLattice, bloom: genBloom, storm: genStorm, orbital: genOrbital, fractal: genFractal, starburst: genStarburst, binary: genBinary, terrace: genTerrace, ribbon: genRibbon, spine: genSpine, city: genCity, shard: genShard, tree: genTree, galaxy: genGalaxy, tesseract: genTesseract, braid: genBraid, origami: genOrigami, cage: genCage, mobius: genMobius, faults: genFaults
  };
  {
    const m = /^c([1-8])_(.+)$/.exec(shape);
    if (m) {
      const c = +m[1];
      const preset = m[2];
      const mix = state.mix4D;
      const dens = state.densityScale;
      if (c === 1) return genTFoldExtreme(preset, n, v, mix, dens);
      if (c === 2) return genOrientifoldExtreme(preset, n, v, mix, dens);
      if (c === 3) return genConifoldExtreme(preset, n, v, mix, dens);
      if (c === 4) return genBranesExtreme(preset, n, v, mix, dens);
      if (c === 5) return genPQWebExtreme(preset, n, v, mix, dens);
      if (c === 6) return genHoloExtreme(preset, n, v, mix, dens);
      if (c === 7) return genFluxExtreme(preset, n, v, mix, dens);
      if (c === 8) return genAmoebaExtreme(preset, n, v, mix, dens);
    }
    return (generators[shape] || genCloud)(n, v);
  }
}

// --- INIT THREE ---
function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, camDist);

  // --- PostFX stack (T168 SSAO + T159 Bloom) ---
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  ssaoPass = new SSAOPass(scene, camera, 1920, 1080);
  ssaoPass.enabled = false;
  setAOQuality("live");
  composer.addPass(ssaoPass);

  bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.35, 0.90);
  bloomPass.enabled = false;
  setBloom("live");
  composer.addPass(bloomPass);

  refreshPostFXEnabled();

  geometry = new THREE.BufferGeometry();
  material = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  points = new THREE.Points(geometry, material);
  scene.add(points);
  resize();
  updateGeo();
}

function resize() {
  if (!renderer) return;
  const rect = viewContainer.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();

  if (composer && typeof composer.setSize === "function") {
    composer.setSize(rect.width, rect.height);
  }
  if (ssaoPass && typeof ssaoPass.setSize === "function") {
    ssaoPass.setSize(rect.width, rect.height);
  }
  if (bloomPass && typeof bloomPass.setSize === "function") {
    bloomPass.setSize(rect.width, rect.height);
  }
}

window.addEventListener("resize", scheduleResize, { passive: true });

try {
  const _ro = new ResizeObserver(() => scheduleResize());
  _ro.observe(viewContainer);
} catch (_e) { }

function updateGeo() {
  const variant = state.mode - 1;
  basePoints = generatePoints(state.shapeFamily, state.n, variant);

  const limit = Math.floor(basePoints.length * state.densityScale);
  const renderPoints = basePoints.slice(0, limit);

  const oldPos = geometry.getAttribute('position');
  if (oldPos) oldPos.dispose();
  const oldCol = geometry.getAttribute('color');
  if (oldCol) oldCol.dispose();

  positions = new Float32Array(renderPoints.length * 3);
  colors = new Float32Array(renderPoints.length * 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  ui.stats.points.textContent = renderPoints.length;
  ui.overlays.family.textContent = state.shapeFamily;
  ui.overlays.n.textContent = state.n;
  ui.overlays.mode.textContent = state.mode;

  updateProjection(0);
}

function updateProjection(dt: number) {
  if (state.animate4D) {
    angleXW += dt * 0.5 * state.wSpeed;
    angleYW += dt * 0.3 * state.wSpeed;
  }

  const cx = Math.cos(angleXW), sx = Math.sin(angleXW);
  const cy = Math.cos(angleYW), sy = Math.sin(angleYW);
  const mix = state.mix4D;

  const count = geometry.attributes.position.count;

  let pi = 0, ci = 0;
  for (let i = 0; i < count; i++) {
    const p = basePoints[i];
    let { x, y, z, w } = p;

    let tx = x * cx - w * sx;
    let tw = x * sx + w * cx;
    x = tx; w = tw;

    let ty = y * cy - w * sy;
    tw = y * sy + w * cy;
    y = ty; w = tw;

    const scale = 1.0 + (w * 0.5 * mix);
    positions[pi++] = x * scale;
    positions[pi++] = y * scale;
    positions[pi++] = z * scale;

    const [r, g, b] = paletteColor(p.u, w);
    colors[ci++] = r * state.brightness;
    colors[ci++] = g * state.brightness;
    colors[ci++] = b * state.brightness;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

// --- CONTROLS ---
function initUI() {
  if (ui.t155Toggle) ui.t155Toggle.checked = !!state.t155Enabled;
  if (ui.t168Toggle) ui.t168Toggle.checked = !!state.t168Enabled;
  if (ui.t159Toggle) ui.t159Toggle.checked = !!state.t159Enabled;

  ui.t155Toggle && ui.t155Toggle.addEventListener("change", (e: Event) => {
    state.t155Enabled = !!(e.target as HTMLInputElement).checked;
    t155TargetPR = state.t155Enabled ? T155_PR.high : Math.min(2.0, (window.devicePixelRatio || 1));
    t155CurrentPR = t155TargetPR;
    renderer && renderer.setPixelRatio(t155CurrentPR);
  });

  ui.t168Toggle && ui.t168Toggle.addEventListener("change", (e: Event) => {
    state.t168Enabled = !!(e.target as HTMLInputElement).checked;
    refreshPostFXEnabled();
  });

  ui.t159Toggle && ui.t159Toggle.addEventListener("change", (e: Event) => {
    state.t159Enabled = !!(e.target as HTMLInputElement).checked;
    refreshPostFXEnabled();
  });

  ui.screenshotBtn && ui.screenshotBtn.addEventListener("click", () => captureScreenshotBeauty(3));

  const fullscreenBtn = document.getElementById('fullscreenButton');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const container = document.getElementById('viewContainer');
      if (!container) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    });
  }

  ui.shapeSelect.addEventListener("change", (e: Event) => {
    state.shapeFamily = (e.target as HTMLSelectElement).value;

    const d = PRESET_DEFAULTS[state.shapeFamily];
    if (d) {
      state.n = d.n;
      state.mode = d.mode;
      state.mix4D = d.mix4D;
      state.densityScale = d.densityScale;

      ui.nSlider.value = state.n; ui.readouts.n.textContent = state.n;
      ui.modeSlider.value = state.mode; ui.readouts.mode.textContent = state.mode;
      ui.mixSlider.value = state.mix4D; ui.readouts.mix.textContent = state.mix4D;
      ui.densitySlider.value = state.densityScale; ui.readouts.density.textContent = state.densityScale + "x";
    }

    updateGeo();
  });
  ui.nSlider.addEventListener("input", (e: Event) => { state.n = parseInt((e.target as HTMLInputElement).value); ui.readouts.n.textContent = state.n; updateGeo(); });
  ui.modeSlider.addEventListener("input", (e: Event) => { state.mode = parseInt((e.target as HTMLInputElement).value); ui.readouts.mode.textContent = state.mode; updateGeo(); });
  ui.mixSlider.addEventListener("input", (e: Event) => { state.mix4D = parseFloat((e.target as HTMLInputElement).value); ui.readouts.mix.textContent = state.mix4D; });
  ui.densitySlider.addEventListener("input", (e: Event) => { state.densityScale = parseFloat((e.target as HTMLInputElement).value); ui.readouts.density.textContent = state.densityScale + "x"; updateGeo(); });

  document.getElementById("btnRandom")!.addEventListener("click", () => {
    const opts = ui.shapeSelect.options;
    state.shapeFamily = opts[Math.floor(Math.random() * opts.length)].value;
    ui.shapeSelect.value = state.shapeFamily;
    state.n = 2 + Math.floor(Math.random() * 8);
    ui.nSlider.value = state.n; ui.readouts.n.textContent = state.n;
    state.mix4D = Math.random();
    ui.mixSlider.value = state.mix4D; ui.readouts.mix.textContent = state.mix4D.toFixed(2);
    updateGeo();
  });
  document.getElementById("btnReset")!.addEventListener("click", () => {
    targetRotX = 0.2; targetRotY = 0.6; targetCamDist = 8;
    state.autoOrbit = true;
  });

  // --- ROBUST GESTURE CONTROLS ---
  let activePointers = new Map<number, PointerEvent>();
  let prevPinchDist = 0;

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomSpeed = 0.002 * targetCamDist;
    targetCamDist = clamp(targetCamDist + (e as WheelEvent).deltaY * zoomSpeed, 2.0, 50.0);
    lastInteractionTime = performance.now();
    markInputT155();
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    activePointers.set(e.pointerId, e);
    canvas.setPointerCapture(e.pointerId);
    isDragging = true;
    lastInteractionTime = performance.now();
    markInputT155();

    if (activePointers.size === 1) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    } else if (activePointers.size === 2) {
      const p = Array.from(activePointers.values());
      prevPinchDist = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    activePointers.set(e.pointerId, e);
    if (!isDragging) return;
    lastInteractionTime = performance.now();
    markInputT155();

    if (activePointers.size === 1) {
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      targetRotY += dx * 0.005;
      targetRotX += dy * 0.005;

    } else if (activePointers.size === 2) {
      const p = Array.from(activePointers.values());
      const dist = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);

      const delta = prevPinchDist - dist;
      targetCamDist += delta * 0.015 * (targetCamDist / 10);
      targetCamDist = clamp(targetCamDist, 2.0, 50.0);

      prevPinchDist = dist;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }
  });

  const onPointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    canvas.releasePointerCapture(e.pointerId);

    if (activePointers.size === 1) {
      const p = activePointers.values().next().value;
      if (p) {
        lastPointerX = p.clientX;
        lastPointerY = p.clientY;
      }
      prevPinchDist = 0;
    } else if (activePointers.size === 0) {
      isDragging = false;
    }
    lastInteractionTime = performance.now();
  };
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);

}

// --- LOOP ---
function animate() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (state.autoOrbit && !isDragging) {
    if (now - lastInteractionTime > 2000) {
      const factor = Math.min((now - lastInteractionTime - 2000) / 2000, 1.0);
      targetRotY += 0.1 * dt * factor;
    }
  }

  const maxVert = 1.5;
  if (targetRotX > maxVert) targetRotX = maxVert;
  if (targetRotX < -maxVert) targetRotX = -maxVert;

  const damp = 5.0 * dt;
  rotX += (targetRotX - rotX) * damp;
  rotY += (targetRotY - rotY) * damp;
  camDist += (targetCamDist - camDist) * damp;

  if (camera) {
    camera.position.set(
      camDist * Math.sin(rotY) * Math.cos(rotX),
      camDist * Math.sin(rotX),
      camDist * Math.cos(rotY) * Math.cos(rotX)
    );
    camera.lookAt(0, 0, 0);
  }

  updateProjection(dt);
  updatePixelRatioT155();
  renderFrameOnce();
  ui.stats.fps.textContent = Math.round(1 / dt);
  animationFrameId = requestAnimationFrame(animate);
}

// --- CLEANUP ---
function cleanup() {
  cancelAnimationFrame(animationFrameId);
  if (renderPass) renderPass.dispose();
  if (ssaoPass) ssaoPass.dispose();
  if (bloomPass) bloomPass.dispose();
  if (composer) composer.dispose();
  if (renderer) renderer.dispose();
  if (geometry) geometry.dispose();
  if (material) material.dispose();
  window.removeEventListener('resize', scheduleResize);
  window.removeEventListener('beforeunload', cleanup);
}
window.addEventListener('beforeunload', cleanup);

// --- BOOT ---
initThree();
initUI();
requestAnimationFrame(() => { try { resize(); } catch (_e) { } });
setTimeout(() => { try { resize(); } catch (_e) { } }, 120);
setTimeout(() => { try { resize(); } catch (_e) { } }, 300);

try {
  if ('ResizeObserver' in window) {
    const __ro = new ResizeObserver(() => { try { resize(); } catch (_e) { } });
    __ro.observe(viewContainer);
  }
  window.addEventListener('orientationchange', () => setTimeout(() => { try { resize(); } catch (_e) { } }, 200));
} catch (_e) { }
animate();
