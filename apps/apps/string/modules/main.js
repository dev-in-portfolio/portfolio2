 if (preset.includes("orientifold")){
 if (x > 0){ x = -x; w *= -1; }
 }
 }

 else if (kind === "holo"){
 // boundary-driven bulk
 const boundary = (v|0)%3; // 0 sphere, 1 box, 2 warped shell
 let bx=0,by=0,bz=0;
 if (boundary === 0){
 // random point on sphere
 const th = rng()*Math.PI*2;
 const ph = Math.acos(2*rng()-1);
 bx = Math.cos(th)*Math.sin(ph);
 by = Math.sin(th)*Math.sin(ph);
 bz = Math.cos(ph);
 } else if (boundary === 1){
 // random point on cube-ish shell
 bx = (rng()*2-1); by = (rng()*2-1); bz=(rng()*2-1);
 const m = Math.max(Math.abs(bx),Math.abs(by),Math.abs(bz));
 bx/=m; by/=m; bz/=m;
 } else {
 const th = rng()*Math.PI*2;
 const ph = Math.acos(2*rng()-1);
 const rr = 1 + 0.25*Math.sin((v+1)*3*th + n);
 bx = rr*Math.cos(th)*Math.sin(ph);
 by = rr*Math.sin(th)*Math.sin(ph);
 bz = rr*Math.cos(ph);
 }

 // boundary “signal”
 const sig = _noise3(bx*6,by*6,bz*6, seed) * 2 - 1;

 // decode into interior
 let depth = rng();
 if (preset.includes("skin")) depth = depth*depth*0.15;
 if (preset.includes("decode")) depth = Math.pow(depth, 0.35);
 if (preset.includes("glyph")) depth = Math.pow(depth, 0.25);
 if (preset.includes("turb")) depth = Math.pow(depth, 0.55);

 // standing wave shells
 if (preset.includes("standing_wave")){
 const shells = 4 + Math.floor(n/2);
 const s = Math.round(depth*shells)/shells;
 depth = s;
 }

 // wormhole bridge: pick two boundary points and connect
 if (preset.includes("bridge")){
 const th2 = rng()*Math.PI*2;
 const ph2 = Math.acos(2*rng()-1);
 const bx2 = Math.cos(th2)*Math.sin(ph2);
 const by2 = Math.sin(th2)*Math.sin(ph2);
 const bz2 = Math.cos(ph2);
 const t = rng();
 bx = _lerp(bx, bx2, t);
 by = _lerp(by, by2, t);
 bz = _lerp(bz, bz2, t);
 depth = _smoothstep(0,1,depth);
 }

 x = bx*(1-depth)*1.65;
 y = by*(1-depth)*1.65;
 z = bz*(1-depth)*1.65;

 // anisotropic decode: stretch along one axis
 if (preset.includes("anisotropic")){
 const ax = (v|0)%3;
 if (ax===0) x *= 1.8;
 if (ax===1) y *= 1.8;
 if (ax===2) z *= 1.8;
 }

 // phase flip boundary: two bulks
 if (preset.includes("phase_flip")){
 const s = sig > 0 ? 1 : -1;
 x *= 1 + 0.25*s;
 y *= 1 - 0.15*s;
 w = s * (0.9 + 0.3*mix4D);
 } else {
 w = sig * (0.9 + 0.3*mix4D);
 }

 u = boundary;
 aux = depth;
 }

 else if (kind === "flux"){
 // braids around cycles / knots
 const strands = 6 + Math.floor(n*2);
 const sId = Math.floor(rng()*strands);
 const t = rng();

 let cx=0,cy=0,cz=0;

 if (preset.includes("hopf")){
 // Hopf-like: many linked circles (approx)
 const phi = (sId/strands)*Math.PI*2;
 const ang = 2*Math.PI*t;
 const R = 1.05, r = 0.55;
 cx = R*Math.cos(phi) + r*Math.cos(ang)*Math.cos(phi + Math.PI/2);
 cy = R*Math.sin(phi) + r*Math.cos(ang)*Math.sin(phi + Math.PI/2);
 cz = r*Math.sin(ang);
 } else if (preset.includes("trefoil")){
 const k = torusKnot(t, 2, 3); cx=k[0]; cy=k[1]; cz=k[2];
 } else if (preset.includes("figure8")){
 const k = torusKnot(t, 3, 4); cx=k[0]; cy=k[1]; cz=k[2];
 } else {
 // default: circle / superbraid
 const ang = 2*Math.PI*t;
 const R = 1.55;
 cx = R*Math.cos(ang); cy = R*Math.sin(ang); cz = 0;
 }

 // braid offsets
 let braidTurns = 2 + Math.floor(n/2);
 if (preset.includes("superbraid")) braidTurns += 3;
 if (preset.includes("fractal")) braidTurns += 4;
 const theta = 2*Math.PI*(braidTurns*t + sId/strands);

 const rad = 0.12 + 0.14*(preset.includes("superbraid") ? 1 : 0) + 0.08*flavorA;
 let ox = Math.cos(theta)*rad;
 let oy = Math.sin(theta)*rad;
 let oz = (Math.sin(theta*0.5) * 0.06);

 // chirality flips
 if (preset.includes("chirality")){
 const flip = (((Math.floor(t*8) + sId) & 1) ? -1 : 1);
 ox *= flip; oy *= -flip;
 w = flip * (0.9 + 0.3*mix4D);
 }

 // writhe/snarl
 if (preset.includes("snarl") || preset.includes("collapse")){
 const j = (rng()-0.5) * (preset.includes("collapse") ? 0.28 : 0.18);
 oz += j;
 }

 // shockwave pulse
 if (preset.includes("shockwave")){
 const pulse = Math.sin((v+1)*2.0 + t*2*Math.PI*(2+n/3));
 ox *= 1 + 0.45*_clamp(pulse, -1, 1);
 w = pulse * (0.9 + 0.3*mix4D);
 }

 // topological pump: move phase around loop
 if (preset.includes("pump")){
 const pump = Math.sin((v+1)*1.3 + t*2*Math.PI);
 oz += pump*0.18;
 w = pump * (0.9 + 0.3*mix4D);
 }

 // boundary-coupled: couple to pseudo boundary signal
 if (preset.includes("boundary_coupled")){
 const sig = _noise3(cx*2,cy*2,cz*2, seed+999);
 const s = (sig>0.5)?1:-1;
 ox *= 1 + 0.35*s;
 oy *= 1 - 0.15*s;
 w = s*(0.9 + 0.3*mix4D);
 }

 x = (cx + ox) * 1.05;
 y = (cy + oy) * 1.05;
 z = (cz + oz) * 1.05;

 if (!preset.includes("shockwave") && !preset.includes("pump") && !preset.includes("chirality")){
 w = Math.sin(theta + (v+1)*0.7) * (0.75 + 0.35*mix4D);
 }

 u = sId;
 aux = t;
 }

 else if (kind === "amoeba"){
 // isosurface-like implicit sampling
 x = (rng()*2-1)*1.2;
 y = (rng()*2-1)*1.2;
 z = (rng()*2-1)*1.2;

 const k = (2.5 + 0.35*n) * (preset.includes("triply") ? 1.25 : 1.0);
 const iso = preset.includes("swiss") ? 0.15 : 0.0;
 const eps = preset.includes("near_singular") ? 0.06 : 0.09;

 let f=0;
 if (preset.includes("triply")){
 f = fTPMS(x,y,z,k);
 } else if (preset.includes("polynomial")){
 f = fPoly(x,y,z,k);
 } else {
 // hybrid amoeba field
 f = 0.7*fTPMS(x,y,z, k*0.85) + 0.3*fPoly(x,y,z, k*1.05);
 }

 // high genus labyrinth: crank frequency & accept thinner band
 const gBoost = preset.includes("high_genus") || preset.includes("handles") ? 1.2 : 1.0;
 const band = eps / gBoost;

 const dist = Math.abs(f - iso);
 const prob = _clamp(1.0 - dist/band, 0, 1);

 if (!accept(0.15 + 0.85*prob)){
 // bias toward surface band
 x *= 0.75; y *= 0.75; z *= 0.75;
 }

 // cusp/crease & spikes
 if (preset.includes("cusp") || preset.includes("crease") || preset.includes("spiky")){
 const sp = (1.0 - prob);
 x += Math.sign(x)*sp*0.22;
 y += Math.sign(y)*sp*0.22;
 z += Math.sign(z)*sp*0.22;
 }

 // foam / percolated: add cellular noise
 if (preset.includes("foam") || preset.includes("percolated")){
 const nv = _noise3(x*4,y*4,z*4, seed+1234);
 x += (nv-0.5)*0.18;
 y += (nv-0.5)*0.18;
 }

 // mirrored parity twin
 if (preset.includes("mirrored")){
 if (x > 0){ x = -x; w *= -1; }
 }

 // embedded conifold / brane pierced / holographic encoded: decorate
 if (preset.includes("conifold")){
 const r = Math.sqrt(x*x+y*y);
 const pinch = 0.10 + 0.04*Math.abs(z);
 x *= (pinch/(0.2+r));
 y *= (pinch/(0.2+r));
 }
 if (preset.includes("brane_pierced")){
 const cut = Math.sin((v+1)*1.1 + x*3) * Math.cos((v+1)*0.9 + y*3);
 z += cut*0.22;
 }
 if (preset.includes("holographic")){
 const enc = Math.sin(x*k*0.6)*Math.sin(y*k*0.6);
 w = enc * (0.9 + 0.3*mix4D);
 } else {
 w = (prob*2-1) * (0.85 + 0.35*mix4D);
 }

 u = 0;
 aux = f;
 }

 pts[i] = {x:x, y:y, z:z, w:w, u:u, v:aux};
 }

 return pts;
 }

 // Category wrappers (shared interface)
 function genTFoldExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("tfold", preset, n, v, mix4D, densityScale); }
 function genOrientifoldExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("orientifold", preset, n, v, mix4D, densityScale); }
 function genConifoldExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("conifold", preset, n, v, mix4D, densityScale); }
 function genBranesExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("branes", preset, n, v, mix4D, densityScale); }
 function genPQWebExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("pqweb", preset, n, v, mix4D, densityScale); }
 function genHoloExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("holo", preset, n, v, mix4D, densityScale); }
 function genFluxExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("flux", preset, n, v, mix4D, densityScale); }
 function genAmoebaExtreme(preset, n, v, mix4D, densityScale){ return _genExtremeCore("amoeba", preset, n, v, mix4D, densityScale); }


function generatePoints(shape, n, v) {
 const generators = {
 cloud: genCloud, knot: genKnot, brane: genBrane, filament: genFilament, shells: genShells, lattice: genLattice, bloom: genBloom, storm: genStorm, orbital: genOrbital, fractal: genFractal, starburst: genStarburst, binary: genBinary, terrace: genTerrace, ribbon: genRibbon, spine: genSpine, city: genCity, shard: genShard, tree: genTree, galaxy: genGalaxy, tesseract: genTesseract, braid: genBraid, origami: genOrigami, cage: genCage, mobius: genMobius, faults: genFaults
 };
 {
 const m = /^c([1-8])_(.+)$/.exec(shape);
 if (m){
 const c = +m[1];
 const preset = m[2];
 const mix = state.mix4D;
 const dens = state.densityScale;
 if (c===1) return genTFoldExtreme(preset, n, v, mix, dens);
 if (c===2) return genOrientifoldExtreme(preset, n, v, mix, dens);
 if (c===3) return genConifoldExtreme(preset, n, v, mix, dens);
 if (c===4) return genBranesExtreme(preset, n, v, mix, dens);
 if (c===5) return genPQWebExtreme(preset, n, v, mix, dens);
 if (c===6) return genHoloExtreme(preset, n, v, mix, dens);
 if (c===7) return genFluxExtreme(preset, n, v, mix, dens);
 if (c===8) return genAmoebaExtreme(preset, n, v, mix, dens);
 }
 return (generators[shape] || genCloud)(n, v);
 }
 }

 // --- INIT THREE ---
 function initThree() {
 if (typeof THREE === "undefined") return;
 renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 scene = new THREE.Scene();
 camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
 camera.position.set(0, 0, camDist);

 // --- PostFX stack (T168 SSAO + T159 Bloom) ---
 // Uses Three.js examples postprocessing. If scripts fail to load, app still works without postFX.
 if (typeof THREE.EffectComposer !== "undefined") {
 composer = new THREE.EffectComposer(renderer);
 renderPass = new THREE.RenderPass(scene, camera);
 composer.addPass(renderPass);

 if (typeof THREE.SSAOPass !== "undefined") {
 ssaoPass = new THREE.SSAOPass(scene, camera, 1, 1);
 ssaoPass.enabled = false;
 setAOQuality("live");
 composer.addPass(ssaoPass);
 }

 if (typeof THREE.UnrealBloomPass !== "undefined") {
 bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.35, 0.90);
 bloomPass.enabled = false;
 setBloom("live");
 composer.addPass(bloomPass);
 }

 refreshPostFXEnabled();
 }
 geometry = new THREE.BufferGeometry();
 material = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
 points = new THREE.Points(geometry, material);
 scene.add(points);
 resize();
 updateGeo();
 }

 function resize() {
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

 // If layout changes without a window resize (shell collapse, sidebar scrollbars, etc.), keep the renderer sized correctly.
 try {
 const _ro = new ResizeObserver(()=> scheduleResize());
 _ro.observe(viewContainer);
 } catch(_e) {}

 function updateGeo() {
 const variant = state.mode - 1;
 basePoints = generatePoints(state.shapeFamily, state.n, variant);
 
 // Point Density Limiter
 const limit = Math.floor(basePoints.length * state.densityScale);
 const renderPoints = basePoints.slice(0, limit);

 positions = new Float32Array(renderPoints.length * 3);
 colors = new Float32Array(renderPoints.length * 3);
 geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 
 // Update UI stats
 ui.stats.points.textContent = renderPoints.length;
 ui.overlays.family.textContent = state.shapeFamily;
 ui.overlays.n.textContent = state.n;
 ui.overlays.mode.textContent = state.mode;
 renderNarrativePanels();
 persistLabState();
 
 updateProjection(0);
 }

 function updateProjection(dt) {
 if(state.animate4D) {
 angleXW += dt * 0.5 * state.wSpeed;
 angleYW += dt * 0.3 * state.wSpeed;
 }

 const cx = Math.cos(angleXW), sx = Math.sin(angleXW);
 const cy = Math.cos(angleYW), sy = Math.sin(angleYW);
 const mix = state.mix4D;
 
 const count = geometry.attributes.position.count;
 
 let pi=0, ci=0;
 for(let i=0; i<count; i++) {
 const p = basePoints[i];
 let {x,y,z,w} = p;
 
 let tx = x*cx - w*sx;
 let tw = x*sx + w*cx;
 x=tx; w=tw;
 
 let ty = y*cy - w*sy;
 tw = y*sy + w*cy;
 y=ty; w=tw;
 
 const scale = 1.0 + (w * 0.5 * mix);
 positions[pi++] = x * scale;
 positions[pi++] = y * scale;
 positions[pi++] = z * scale;

 const [r,g,b] = paletteColor(p.u, w);
 colors[ci++] = r * state.brightness;
 colors[ci++] = g * state.brightness;
 colors[ci++] = b * state.brightness;
 }
 
 geometry.attributes.position.needsUpdate = true;
 geometry.attributes.color.needsUpdate = true;
 }

 // --- CONTROLS ---
 function initUI() {
 syncPrimaryControls();
 renderNarrativePanels();
 // Techniques UI
 if (ui.t155Toggle) ui.t155Toggle.checked = !!state.t155Enabled;
 if (ui.t168Toggle) ui.t168Toggle.checked = !!state.t168Enabled;
 if (ui.t159Toggle) ui.t159Toggle.checked = !!state.t159Enabled;

 ui.t155Toggle && ui.t155Toggle.addEventListener("change", (e) => {
 state.t155Enabled = !!e.target.checked;
 // Snap PR immediately to the appropriate target
 t155TargetPR = state.t155Enabled ? T155_PR.high : Math.min(2.0, (window.devicePixelRatio || 1));
 t155CurrentPR = t155TargetPR;
 renderer && renderer.setPixelRatio(t155CurrentPR);
 });

 ui.t168Toggle && ui.t168Toggle.addEventListener("change", (e) => {
 state.t168Enabled = !!e.target.checked;
 refreshPostFXEnabled();
 });

 ui.t159Toggle && ui.t159Toggle.addEventListener("change", (e) => {
 state.t159Enabled = !!e.target.checked;
 refreshPostFXEnabled();
 });

 ui.screenshotBtn && ui.screenshotBtn.addEventListener("click", () => captureScreenshotBeauty(3));

 ui.shapeSelect.addEventListener("change", e => {
 state.shapeFamily = e.target.value;
 state.activePresetId = "default-lab";

 // Apply per-preset defaults (only for the c1_..c8_ extreme structures)
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
 ui.nSlider.addEventListener("input", e => { state.n = parseInt(e.target.value); ui.readouts.n.textContent = state.n; updateGeo(); });
 ui.modeSlider.addEventListener("input", e => { state.mode = parseInt(e.target.value); ui.readouts.mode.textContent = state.mode; updateGeo(); });
 ui.mixSlider.addEventListener("input", e => { state.mix4D = parseFloat(e.target.value); ui.readouts.mix.textContent = Number(state.mix4D).toFixed(2); renderNarrativePanels(); persistLabState(); });
 ui.densitySlider.addEventListener("input", e => { state.densityScale = parseFloat(e.target.value); ui.readouts.density.textContent = state.densityScale+"x"; updateGeo(); });
 ui.presetSelect && ui.presetSelect.addEventListener("change", (e) => {
  state.activePresetId = e.target.value;
  renderNarrativePanels();
  persistLabState();
 });
 ui.applyPresetBtn && ui.applyPresetBtn.addEventListener("click", () => {
  const preset = presetById(state.activePresetId);
  applySnapshot(preset.snapshot, preset.id);
 });
 ui.saveBaselineBtn && ui.saveBaselineBtn.addEventListener("click", () => {
  AUTHORED_PRESETS[0].snapshot = currentSnapshot();
  state.activePresetId = "default-lab";
  renderNarrativePanels();
  persistLabState();
 });
 ui.captureABtn && ui.captureABtn.addEventListener("click", () => captureCompare("a"));
 ui.captureBBtn && ui.captureBBtn.addEventListener("click", () => captureCompare("b"));
 ui.applyABtn && ui.applyABtn.addEventListener("click", () => {
  const slot = state.compareSlots.a;
  if (slot && slot.snapshot) applySnapshot(slot.snapshot);
 });
 ui.applyBBtn && ui.applyBBtn.addEventListener("click", () => {
  const slot = state.compareSlots.b;
  if (slot && slot.snapshot) applySnapshot(slot.snapshot);
 });

 document.getElementById("btnRandom").addEventListener("click", () => {
 const opts = ui.shapeSelect.options;
 state.shapeFamily = opts[Math.floor(Math.random()*opts.length)].value;
 state.activePresetId = "default-lab";
 ui.shapeSelect.value = state.shapeFamily;
 state.n = 2 + Math.floor(Math.random()*8);
 ui.nSlider.value = state.n; ui.readouts.n.textContent = state.n;
 state.mix4D = Math.random();
 ui.mixSlider.value = state.mix4D; ui.readouts.mix.textContent = state.mix4D.toFixed(2);
 updateGeo();
 });
 document.getElementById("btnReset").addEventListener("click", () => { 
 targetRotX=0.2; targetRotY=0.6; targetCamDist=8; 
 // Reset momentum
 state.autoOrbit = true;
 });

 // --- ROBUST GESTURE CONTROLS ---
 let activePointers = new Map();
 let prevPinchDist = 0;

 canvas.addEventListener("wheel", (e) => {
 e.preventDefault();
 // Smooth zoom target
 const zoomSpeed = 0.002 * targetCamDist; // scale zoom by distance
 targetCamDist = clamp(targetCamDist + e.deltaY * zoomSpeed, 2.0, 50.0);
 lastInteractionTime = performance.now();
 markInputT155(); // Pause auto-rotate
 }, { passive: false });

 canvas.addEventListener("pointerdown", (e) => {
 activePointers.set(e.pointerId, e);
 canvas.setPointerCapture(e.pointerId);
 isDragging = true;
 lastInteractionTime = performance.now();
 markInputT155();
 
 // Update logic based on finger count to prevent jumps
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
 // Single finger rotate
 const dx = e.clientX - lastPointerX; 
 const dy = e.clientY - lastPointerY;
 lastPointerX = e.clientX; 
 lastPointerY = e.clientY;
 
 targetRotY += dx * 0.005; 
 targetRotX += dy * 0.005;
 
 } else if (activePointers.size === 2) {
 // Two finger pinch
 const p = Array.from(activePointers.values());
 const dist = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
 
 const delta = prevPinchDist - dist;
 // Sensitivity based on distance
 targetCamDist += delta * 0.015 * (targetCamDist/10);
 targetCamDist = clamp(targetCamDist, 2.0, 50.0);
 
 prevPinchDist = dist;
 // Update "last" position to prevent jump when lifting one finger
 lastPointerX = e.clientX;
 lastPointerY = e.clientY;
 }
 });

 const onPointerUp = (e) => {
 activePointers.delete(e.pointerId);
 canvas.releasePointerCapture(e.pointerId);
 
 // If we dropped from 2 fingers to 1, re-sync the drag start
 // so the rotation doesn't jump
 if (activePointers.size === 1) {
 const p = activePointers.values().next().value;
 lastPointerX = p.clientX;
 lastPointerY = p.clientY;
 prevPinchDist = 0;
 } else if (activePointers.size === 0) {
 isDragging = false;
 // Momentum will naturally carry on in animate() due to lerping
 }
 lastInteractionTime = performance.now();
 };
 canvas.addEventListener("pointerup", onPointerUp);
 canvas.addEventListener("pointercancel", onPointerUp);
 canvas.addEventListener("pointerout", onPointerUp);

 }

 // --- LOOP ---
 function animate() {
 const now = performance.now();
 const dt = Math.min((now - lastTime)/1000, 0.1);
 lastTime = now;

 // Auto Orbit Resume Logic
 // If not dragging and user hasn't touched for 2s, slowly resume auto-spin
 if (state.autoOrbit && !isDragging) {
 if (now - lastInteractionTime > 2000) {
 // Ramp up
 const factor = Math.min((now - lastInteractionTime - 2000)/2000, 1.0);
 targetRotY += 0.1 * dt * factor; 
 }
 }

 // Soft clamp vertical rotation (prevent flipping upside down)
 // 1.57 is roughly PI/2
 const maxVert = 1.5; 
 if (targetRotX > maxVert) targetRotX = maxVert;
 if (targetRotX < -maxVert) targetRotX = -maxVert;

 // Smooth Interpolation (Damped physics feel)
 const damp = 5.0 * dt; // Adjust damping speed
 rotX += (targetRotX - rotX) * damp;
 rotY += (targetRotY - rotY) * damp;
 camDist += (targetCamDist - camDist) * damp;

 if (camera) {
 camera.position.set(
 camDist * Math.sin(rotY) * Math.cos(rotX),
 camDist * Math.sin(rotX),
 camDist * Math.cos(rotY) * Math.cos(rotX)
 );
 camera.lookAt(0,0,0);
 }

 updateProjection(dt);
 updatePixelRatioT155();
 renderFrameOnce();
 ui.stats.fps.textContent = Math.round(1/dt);
 requestAnimationFrame(animate);
 }

 // --- BOOT ---
 loadLabState();
 initThree();
 initUI();
 // P11: force a couple of post-layout resizes (some mobile browsers report 0px on first paint)
 requestAnimationFrame(()=>{ try { resize(); } catch(_e){} });
 setTimeout(()=>{ try { resize(); } catch(_e){} }, 120);
 setTimeout(()=>{ try { resize(); } catch(_e){} }, 300);

 // P11: track container changes (sidebar collapse, fullscreen, orientation, etc.)
 try{
 if ('ResizeObserver' in window) {
 const __ro = new ResizeObserver(()=>{ try { resize(); } catch(_e){} });
 __ro.observe(viewContainer);
 }
 window.addEventListener('orientationchange', ()=>setTimeout(()=>{ try { resize(); } catch(_e){} }, 200));
 }catch(_e){}
 animate();

})();
</script>
<script type="module">
 // Optional WebLLM + Forge driver (safe to ignore if unsupported)
 try {
 const webllmPromise = import("https://esm.run/@mlc-ai/web-llm@0.2.46");
 webllmPromise.then(async (webllm) => {
 window.Forge = window.Forge || {
 drivers: {},
 registerLLM(name, driver) { this.drivers[name] = driver; },
 async chat(opts) {
 for (const name of (opts.modelList || [])) {
 const drv = this.drivers[name];
 if (drv && await drv.ready()) {
 return drv.generate(opts);
 }
 }
 throw new Error("No AI driver available");
 }
 };
 window.Forge.registerLLM("gemma-webllm", {
 engine: null,
 async ready() { return typeof navigator !== "undefined" && !!navigator.gpu; },
 async generate(opts) {
 if (!this.engine) {
 this.engine = await webllm.CreateMLCEngine("Phi-3-mini-4k-instruct-q4f16_1-MLC");
 }
 const reply = await this.engine.chat.completions.create({
 messages: [
 { role: "system", content: opts.system },
 { role: "user", content: opts.prompt }
 ]
 });
 return { text: reply.choices[0].message.content };
 }
 });
 const diag = document.getElementById("ai-diag-status");
 if (diag) diag.textContent = "AI Ready (WebLLM registered)";
 }).catch((e) => {
 console.warn("WebLLM import failed (okay on low-end devices):", e);
 });
 } catch (e) {
 console.warn("Dynamic import not supported, skipping WebLLM:", e);
 }
</script>
<script>
(function(global) {
 // --- PREMIUM CURSOR ORB WIRING ---
 const orb = document.getElementById("cursorOrb");
 const isCoarse = global.matchMedia && global.matchMedia("(pointer: coarse)").matches;
 if (isCoarse) {
 document.body.classList.add("cursor-coarse");
 } else if (orb) {
 let rafId = null;
 let targetX = global.innerWidth / 2;
 let targetY = global.innerHeight / 2;

 function moveOrb(x, y) {
 targetX = x;
 targetY = y;
 if (!rafId) {
 rafId = global.requestAnimationFrame(() => {
 orb.style.left = targetX + "px";
 orb.style.top = targetY + "px";
 orb.classList.add("is-active");
 rafId = null;
 });
 }
 }

 document.addEventListener("pointermove", (e) => {
 if (e.pointerType === "mouse" || e.pointerType === "pen") {
 moveOrb(e.clientX, e.clientY);
 }
 }, { passive: true });

 document.addEventListener("pointerdown", (e) => {
 if (e.pointerType === "mouse" || e.pointerType === "pen") {
 orb.classList.add("is-pressed");
 }
 }, { passive: true });

 document.addEventListener("pointerup", () => {
 orb.classList.remove("is-pressed");
 }, { passive: true });

 document.addEventListener("mouseleave", () => {
 orb.classList.remove("is-active");
 });
 }

 // --- META OVERLAY CONTROLLER (About / README / 404) ---
 let activeOverlay = null;

 function openOverlay(id) {
 const el = document.getElementById(id);
 if (!el) return;
 if (activeOverlay && activeOverlay !== el) {
 activeOverlay.classList.remove("is-open");
 activeOverlay.setAttribute("aria-hidden", "true");
 }
 activeOverlay = el;
 el.classList.add("is-open");
 el.setAttribute("aria-hidden", "false");
 const focusTarget =
 el.querySelector("[data-modal-focus]") ||
 el.querySelector("button, [href], textarea, input, select");
 if (focusTarget && typeof focusTarget.focus === "function") {
 focusTarget.focus();
 }
 }

 function closeOverlay() {
 if (!activeOverlay) return;
 activeOverlay.classList.remove("is-open");
 activeOverlay.setAttribute("aria-hidden", "true");
 activeOverlay = null;
 }

 document.querySelectorAll("[data-open-overlay]").forEach((el) => {
 el.addEventListener("click", () => {
 const id = el.getAttribute("data-open-overlay");
 if (id) openOverlay(id);
 });
 });

 document.querySelectorAll("[data-overlay-close]").forEach((el) => {
 el.addEventListener("click", () => closeOverlay());
 });

 document.addEventListener("keydown", (e) => {
 if (e.key === "Escape") {
 closeOverlay();
 const devPanel = document.getElementById("devPanel");
 if (devPanel) {
 devPanel.classList.remove("is-open");
 devPanel.setAttribute("aria-hidden", "true");
 }
 }
 });

 const title = document.getElementById("appTitle");
 if (title) {
 title.addEventListener("dblclick", () => openOverlay("aboutOverlay"));
 }

 if (global.location && global.location.hash === "#404") {
 openOverlay("notFoundOverlay");
 }
 if (global.location && global.location.hash === "#home") {
 if (activeOverlay) closeOverlay();
 }

 // STRING dsSplash controller
(function(){
 const root = document.getElementById("dsSplash");
 if (!root) return;

 const steps = Array.from(root.querySelectorAll(".ds-splash-step"));
 const dots = Array.from(root.querySelectorAll(".ds-splash-dot"));
 const btnNext = root.querySelector("[data-splash-next]");
 const btnStart = root.querySelector("[data-splash-start]");
 let currentStep = 1;

 function setStep(step) {
 currentStep = step;
 steps.forEach((el, idx) => {
 el.classList.toggle("active", idx === step - 1);
 });
 dots.forEach((dot, idx) => {
 dot.classList.toggle("active", idx === step - 1);
 });
 }

 if (btnNext) {
 btnNext.addEventListener("click", () => {
 const next = currentStep === 1 ? 2 : 1;
 setStep(next);
 });
 }

 if (btnStart) {
 btnStart.addEventListener("click", () => {
 root.classList.add("ds-splash-hidden");
 // Allow any transition to play, then fully remove
 setTimeout(() => {
 root.remove();
 }, 400);
 });
 }

 // Optional: start on step 1 by default
 setStep(1);
})();

})(window);
</script>
<!-- Shared helpers (kept alongside apps for single-folder deployment) -->
<script src="/shared/global-polyfill.js?v=20251230"></script>
<script src="/shared/ui-helpers.js?v=20251219"></script>
<script src="/shared/ai-personas.js?v=20251219"></script>
<script src="/shared/ai-diagnostics.js?v=20251219"></script>
<script src="/shared/ai-engines.js?v=20251219" type="module"></script>
<script src="/shared/forge-sdk.llm.js?v=20251219"></script>
<script src="/shared/forge-llm-drivers.js?v=20251219" type="module"></script>
<!-- removed legacy overlay wiring -->
<script id="phase4-cleanup">
/* PHASE4_CLEANUP: remove legacy splash/boot overlays + in-app advisor panels (Ask Althea stays) */
(function(){
 function isKeep(el){
 const id=(el.id||"").toLowerCase();
 const cls=(el.className||"").toString().toLowerCase();
 // Keep Ask Althea / nexus shell bits
 if (id.includes("althea") || id.includes("ask") || id.includes("nexus")) return true;
 if (cls.includes("nexus") || cls.includes("althea")) return true;
 return false;
 }

 function nukeSplash(){
 const ids = [
 "nexusBootOverlay","nexusBootTip","dsSplash","dsSplashOverlay","splashOverlay",
 "splash","splashScreen","splashModal"
 ];
 ids.forEach(id=>{
 const el=document.getElementById(id);
 if(el) el.remove();
 });
 // common class patterns
 document.querySelectorAll(
 ".ds-splash,.ds-splash-overlay,.splash,.splash-overlay,.splash-screen, [data-splash]"
 ).forEach(el=>{
 // Don't remove normal stepper components that are not splash: guard by ancestor splash-ish
 const looksSplash = (el.className||"").toString().toLowerCase().includes("splash") ||
 (el.id||"").toLowerCase().includes("splash") ||
 el.hasAttribute("data-splash");
 if(looksSplash && !isKeep(el)) el.remove();
 });

 document.body.classList.remove("nexus-booting","booting","no-scroll","locked","modal-open");
 document.documentElement.classList.remove("nexus-booting","booting","no-scroll","locked","modal-open");
 document.body.style.overflow="";
 document.documentElement.style.overflow="";
 }

 function nukeAdvisors(){
 // remove/hide any AI advisor docks or panels, but keep Ask Althea
 const sel = [
 ".ai-advisors",".ai-advisor",".ai-panel",".ai-panels",".ai-tabs",".ai-tab",".ai-tabbar",
 ".advisor",".advisors",".advisor-panel",".advisor-tabs",".advisor-dock",".advisorDock",
 "[data-advisor]","[data-role='coach']","[data-role='critic']","[data-role='architect']",
 "[data-advisor-panel]","[data-advisor-role]"
 ].join(",");
 document.querySelectorAll(sel).forEach(el=>{
 if (isKeep(el)) return;
 // If it contains Ask Althea controls, keep
 const text=(el.textContent||"").toLowerCase();
 if (text.includes("ask althea")) return;
 el.remove();
 });
 }

 function run(){
 try{ nukeSplash(); }catch(e){}
 try{ nukeAdvisors(); }catch(e){}
 }

 // run multiple times to catch late-inserted UI
 window.addEventListener("DOMContentLoaded", run);
 window.addEventListener("load", function(){
 run();
 setTimeout(run, 250);
 setTimeout(run, 800);
 setTimeout(run, 1500);
 });
})();
</script>
<!-- PHASE8_UI_CLEANUP (hard-disable all splash screens + hide any remaining advisor UI) -->
<style id="phase8-ui-cleanup">
 /* Hide any splash/intro overlays that can steal focus or slide the layout */
 [id*="splash" i], [class*="splash" i], [data-splash], [data-stepper="splash"],
.ds-splash-root,.ds-splash-overlay,.ds-splash-shell,.ds-splash-panel,
.helix-splash,.helix-splash-root,.helix-splash-shell {
 display:none !important;
 visibility:hidden !important;
 pointer-events:none !important;
 }

 /* Hide any legacy in-app advisors. Ask Althea remains as its own button/modal. */
.ai-advisors,.ai-advisor,.ai-panel,.ai-panels,.ai-tabs,.ai-tab,.ai-tabbar,
.advisor,.advisors,.advisor-panel,.advisor-tabs,.advisor-dock,.advisorDock,
.advisor-tab, #aiAdvisorPanel, #aiAdvisorDock, #aiAdvisorModal, #aiAdvisor, #advisorPanel,
 #advisorHeader, #advisorTabs, #advisorContent, #advisorLogs, #advisorInputRow,
 [data-advisor], [data-advisor-panel], [data-advisor-role], [data-role="coach"], [data-role="critic"], [data-role="architect"] {
 display:none !important;
 visibility:hidden !important;
 pointer-events:none !important;
 }
</style>
<script>
(() => {
 const safeRemove = (el) => {
 if (!el) return;
 const id = (el.id || '').toLowerCase();
 const cls = (el.className || '').toString().toLowerCase();
 // Keep Ask Althea
 if (id.includes('askalthea') || cls.includes('askalthea')) return;
 if (el.closest && el.closest('#askAltheaModal')) return;
 try { el.remove(); } catch(e) { try { el.parentNode && el.parentNode.removeChild(el); } catch(_) {} }
 };

 const removeSelectors = [
 // Splash overlays
 '[id*="splash" i]','[class*="splash" i]','[data-splash]','[data-stepper="splash"]',
 '.ds-splash-root','.ds-splash-overlay','.ds-splash-shell','.ds-splash-panel',
 '.helix-splash','.helix-splash-root','.helix-splash-shell',
 '#splashOverlay','#ds-splash-overlay','#splash1','#splash2',
 // Legacy advisor UI
 '[id*="advisor" i]','[class*="advisor" i]','[data-advisor]','[data-advisor-panel]','[data-advisor-role]',
 '.ai-advisors','.ai-advisor','.ai-panel','.ai-panels','.ai-tabs','.ai-tab','.ai-tabbar'
 ];

 try { removeSelectors.forEach(sel => document.querySelectorAll(sel).forEach(safeRemove)); } catch(e) {}

 // Always unlock scroll even if earlier code tried to freeze the page.
 try {
 document.documentElement.classList.remove('no-scroll','modal-open','ds-splash-open','splash-open');
 document.body.classList.remove('no-scroll','modal-open','ds-splash-open','splash-open');
 document.documentElement.style.overflow = '';
 document.body.style.overflow = '';
 } catch(e) {}

 // Neutralize common open/toggle globals if they exist.
 const no = () => {};
 [
 'toggleSplashOverlay','openSplash','showSplash','openSplashFlow','openSplashModal','openSplashScreen','showIntro',
 'openAdvisor','toggleAdvisor','showAdvisor','openAdvisors','toggleAdvisors','AIAdvisorsOpen'
 ].forEach(k => { try { if (typeof window[k] === 'function') window[k] = no; } catch(e) {} });

 // Mark known splash flags as seen so other code paths short-circuit.
 try {
 const keys = [
 'aeon_splashes_seen','anvil_splash_seen_v1','event_splash_seen_v1','helix_splash_seen_v1',
 'string_splash_seen_v1','tectonic_splash_seen_v1','transit_splash_seen_v1','vortex_splash_seen_v1','magma_splash_seen_v1'
 ];
 keys.forEach(k => { try { localStorage.setItem(k,'1'); } catch(_) {} });
 } catch(e) {}
})();
</script>
<script src="/shared/state-store.js?v=20251230"></script>
<script src="/shared/telemetry-hub.js?v=20251230"></script>
<script src="/shared/ai-router.js?v=20251230" type="module"></script>
<script src="/shared/force-catch-clear.js?v=20251230"></script><script>
/* Per-app Nexus routing: guarantees Readme/Help/404/Althea aren’t dead ends. */
(() => {
 const app = document.body.getAttribute("data-app") || window.APP_ID || "";
 if(!app) return;
 const map = {
 home: "/index.html",
 readme: `/readme/${app}/`,
 help: `/help/${app}/`,
 nf: `/404/${app}/`,
 althea: `/althea/?app=${app}`
 };
 document.querySelectorAll('[data-nexus]').forEach(a => {
 const k = a.getAttribute('data-nexus');
 if(map[k]) a.setAttribute('href', map[k]);
 });
})();
</script>
<script src="/shared/app-settings.js?v=20260101"></script>
<script defer="defer" src="/shared/nexus-topnav-v2.js?v=54"></script>
