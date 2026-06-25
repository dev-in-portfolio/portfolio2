/* ToonStudio Pro — Vanilla Static Runtime (no build step)
   - Preserves original Tailwind/FontAwesome styling & layout
   - Local-first: key stored in localStorage
   - Demo mode works offline
   - Upgraded to Frame Animator Edition with Layer Canvas, Onion Skinning, and Playback Timeline
*/
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LS = {
    key: "toonstudio.apiKey",
    project: "toonstudio.project.v1"
  };

  const STEPS = ["SETUP", "CHARACTERS", "STORYBOARD", "PRODUCTION", "PREVIEW"];

  const STYLES = [
    "Pixar", "DreamWorks", "Anime", "Claymation", "2D Classic", "Comic"
  ];

  const state = {
    step: "SETUP",
    apiKey: localStorage.getItem(LS.key) || "",
    loading: false,
    error: "",
    project: loadProject() || {
      style: "Pixar",
      concept: "",
      characters: [],
      storyboard: [],
      frames: [
        { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } }
      ]
    },
    demoOn: false,
    activeFrameIndex: 0,
    activeLayerName: "Character",
    activeTool: "pen",
    brushSize: 6,
    brushOpacity: 1.0,
    brushShape: "round",
    brushColor: "#6366f1",
    onionSkinOn: true,
    playbackFps: 6
  };

  function loadProject() {
    try {
      const raw = localStorage.getItem(LS.project);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (!parsed.frames || parsed.frames.length === 0)) {
        parsed.frames = [
          { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } }
        ];
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveProject() {
    try {
      localStorage.setItem(LS.project, JSON.stringify(state.project));
      scheduleServerSync();
    } catch {}
  }

  // ------------------------- Backend Sync (optional) -------------------------
  const SERVER = { saveUrl: "/api/toon-project-save" };
  let _syncTimer = null;

  function buildServerPayload() {
    return { kind: "toonstudio_project_v1", ts: Date.now(), project: state.project };
  }

  async function serverSaveNow() {
    const clientId = (state.apiKey || "").trim();
    if (!clientId) return;
    try {
      await fetch(SERVER.saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, payload: buildServerPayload() }),
      });
    } catch (_) {}
  }

  function scheduleServerSync() {
    const clientId = (state.apiKey || "").trim();
    if (!clientId) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => { serverSaveNow(); }, 900);
  }

  async function serverLoadLatest() {
    const clientId = (state.apiKey || "").trim();
    if (!clientId) return;
    try {
      const res = await fetch(`${SERVER.saveUrl}?client_id=${encodeURIComponent(clientId)}&limit=1`, { method: "GET" });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const p = data?.items?.[0]?.payload;
      if (!p || typeof p !== "object") return;
      if (p.project && typeof p.project === "object") {
        state.project = p.project;
        if (!state.project.frames || state.project.frames.length === 0) {
          state.project.frames = [
            { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } }
          ];
        }
        saveProject();
        render();
      }
    } catch (_) {}
  }

  function setError(msg) {
    state.error = msg || "";
    render();
    if (msg) setTimeout(() => { state.error = ""; render(); }, 6000);
  }

  function canAdvanceTo(step) {
    const cur = STEPS.indexOf(state.step);
    const nxt = STEPS.indexOf(step);
    return nxt <= cur;
  }

  function setStep(step) {
    if (!STEPS.includes(step)) return;
    state.step = step;
    render();
  }

  function resetProject() {
    state.project = {
      style: "Pixar",
      concept: "",
      characters: [],
      storyboard: [],
      frames: [
        { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } }
      ]
    };
    state.activeFrameIndex = 0;
    state.activeLayerName = "Character";
    state.demoOn = false;
    saveProject();
    setStep("SETUP");
  }

  function openSetup() {
    const modal = $("#ts-setup-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    const input = $("#ts-api-key");
    if (input) input.value = state.apiKey || "";
    input && input.focus();
  }

  function closeSetup() {
    const modal = $("#ts-setup-modal");
    modal && modal.classList.add("hidden");
  }

  function saveKey() {
    const input = $("#ts-api-key");
    const key = (input && input.value || "").trim();
    state.apiKey = key;
    try { localStorage.setItem(LS.key, key); } catch {}
    closeSetup();
    render();
    serverLoadLatest();
  }

  function maskKey(key) {
    if (!key) return "Not connected";
    if (key.length <= 6) return "••••••";
    return "•••• " + key.slice(-4);
  }

  function demo() {
    state.demoOn = true;
    state.project.style = "Pixar";
    state.project.concept = "A tiny, overly-confident squirrel director tries to film an epic space opera inside a shoebox.";
    state.project.characters = [
      { id: "c1", name: "Captain Nutbeam", description: "Heroic squirrel captain with dramatic speeches and a tiny cape." },
      { id: "c2", name: "Gizmo the Firefly", description: "Neon sidekick that provides lighting, sass, and navigation." },
      { id: "c3", name: "The Shoebox Galaxy", description: "A cardboard universe full of glitter, tape, and impossible stakes." }
    ];
    state.project.storyboard = [
      { id: "s1", title: "Cold Open", visual: "Starfield inside the shoebox. Captain Nutbeam vows glory.", beats: ["Establish world", "Introduce hero", "Inciting incident"] },
      { id: "s2", title: "The Rift", visual: "A tear in the cardboard reveals a bigger universe.", beats: ["Discovery", "Decision", "Countdown"] },
      { id: "s3", title: "Finale", visual: "Epic battle… with craft supplies.", beats: ["Climax", "Twist", "Triumphant button"] }
    ];
    state.project.frames = [
      { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } },
      { id: "f2", layers: { "Background": "", "Character": "", "Foreground": "" } },
      { id: "f3", layers: { "Background": "", "Character": "", "Foreground": "" } }
    ];
    state.activeFrameIndex = 0;
    saveProject();
    setStep("CHARACTERS");
  }

  async function generateScriptSuggestion() {
    const concept = state.project.concept.trim();
    if (!concept) return setError("Add a concept first.");
    state.loading = true; render();

    try {
      if (!state.apiKey) {
        state.project.storyboard = [
          { id: "s1", title: "Setup", visual: "Introduce tone and protagonist.", beats: ["Hook", "Character", "Goal"] },
          { id: "s2", title: "Conflict", visual: "Obstacle escalates.", beats: ["Complication", "Choice", "Risk"] },
          { id: "s3", title: "Payoff", visual: "Resolution with Pixar-style heart.", beats: ["Climax", "Emotion", "Tag"] },
        ];
        state.project.frames = [
          { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } },
          { id: "f2", layers: { "Background": "", "Character": "", "Foreground": "" } },
          { id: "f3", layers: { "Background": "", "Character": "", "Foreground": "" } }
        ];
        state.activeFrameIndex = 0;
        saveProject();
        setStep("STORYBOARD");
        return;
      }

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + encodeURIComponent(state.apiKey);
      const prompt = `You are ToonStudio. Create a 3-scene storyboard outline (title + visual description + 3 beats) for this concept:\n\n${concept}\n\nReturn JSON with: scenes:[{id,title,visual,beats:[..]}].`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error("Service temporarily unavailable (" + res.status + ")");
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Sync queued — try again.");
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed?.scenes?.length) throw new Error("Sync queued — try again.");
      state.project.storyboard = parsed.scenes.map((s, i) => ({
        id: s.id || ("s" + (i+1)),
        title: s.title || ("Scene " + (i+1)),
        visual: s.visual || "",
        beats: Array.isArray(s.beats) ? s.beats.slice(0, 5) : []
      }));
      state.project.frames = [
        { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } },
        { id: "f2", layers: { "Background": "", "Character": "", "Foreground": "" } },
        { id: "f3", layers: { "Background": "", "Character": "", "Foreground": "" } }
      ];
      state.activeFrameIndex = 0;
      saveProject();
      setStep("STORYBOARD");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      state.loading = false; render();
    }
  }

  function exportProject() {
    const now = Date.now();
    if (state.__exportCooldownUntil && now < state.__exportCooldownUntil) return;
    state.__exportCooldownUntil = now + 2000;

    if (state.demoOn) {
      openSetup();
      const desc = document.getElementById("ts-setup-desc");
      if (desc) desc.textContent = "Insert your key and make your own project to export.";
      return;
    }

    const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "toonstudio_project.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function importProject(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed) throw new Error("Invalid file");
      state.project = {
        style: parsed.style || "Pixar",
        concept: parsed.concept || "",
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        storyboard: Array.isArray(parsed.storyboard) ? parsed.storyboard : [],
        frames: Array.isArray(parsed.frames) ? parsed.frames : [
          { id: "f1", layers: { "Background": "", "Character": "", "Foreground": "" } }
        ]
      };
      state.activeFrameIndex = 0;
      saveProject();
      render();
    } catch (e) {
      setError("Import failed");
    }
  }

  // ------------------------- Timeline Actions -------------------------
  function addFrame() {
    const newFrame = {
      id: "f" + Math.random().toString(36).slice(2, 6),
      layers: { "Background": "", "Character": "", "Foreground": "" }
    };
    state.project.frames.splice(state.activeFrameIndex + 1, 0, newFrame);
    state.activeFrameIndex++;
    saveProject();
    render();
  }

  function duplicateFrame() {
    const curr = state.project.frames[state.activeFrameIndex];
    const newFrame = {
      id: "f" + Math.random().toString(36).slice(2, 6),
      layers: { ...curr.layers }
    };
    state.project.frames.splice(state.activeFrameIndex + 1, 0, newFrame);
    state.activeFrameIndex++;
    saveProject();
    render();
  }

  function deleteFrame() {
    if (state.project.frames.length <= 1) {
      setError("Cannot delete the only frame.");
      return;
    }
    state.project.frames.splice(state.activeFrameIndex, 1);
    state.activeFrameIndex = Math.max(0, state.activeFrameIndex - 1);
    saveProject();
    render();
  }

  // ------------------------- Canvas Drawing Core -------------------------
  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  function initCanvasDrawing() {
    const drawCanvas = $("#drawCanvas");
    if (!drawCanvas) return;

    const onionCanvas = $("#onionCanvas");
    const bgCanvas = $("#layer-Background");
    const charCanvas = $("#layer-Character");
    const foreCanvas = $("#layer-Foreground");

    const canvases = [onionCanvas, bgCanvas, charCanvas, foreCanvas, drawCanvas];
    canvases.forEach(c => {
      if (c) {
        c.width = 640;
        c.height = 360;
      }
    });

    const drawCtx = drawCanvas.getContext("2d");
    const frame = state.project.frames[state.activeFrameIndex];
    if (!frame) return;

    // 1. Draw layers
    const layers = ["Background", "Character", "Foreground"];
    layers.forEach(layerName => {
      const canvas = $(`#layer-${layerName}`);
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const dataUrl = frame.layers[layerName];
        if (dataUrl) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = dataUrl;
        }
      }
    });

    // 2. Draw Onion Skin (previous frame at 25% opacity)
    if (onionCanvas && state.onionSkinOn && state.activeFrameIndex > 0) {
      const prevFrame = state.project.frames[state.activeFrameIndex - 1];
      const ctx = onionCanvas.getContext("2d");
      ctx.clearRect(0, 0, onionCanvas.width, onionCanvas.height);
      ctx.globalAlpha = 0.25;

      layers.forEach(layerName => {
        const dataUrl = prevFrame.layers[layerName];
        if (dataUrl) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = dataUrl;
        }
      });
    }

    // 3. Mouse/Touch Coordinates Helper
    const getMousePos = (canvas, evt) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    // 4. Input Events
    const startDraw = (e) => {
      const pos = getMousePos(drawCanvas, e);
      drawing = true;
      lastX = pos.x;
      lastY = pos.y;

      drawCtx.strokeStyle = state.brushColor;
      drawCtx.lineWidth = state.brushSize;
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawCtx.globalAlpha = state.brushOpacity;

      if (state.activeTool === "eraser") {
        const activeCanvas = $(`#layer-${state.activeLayerName}`);
        if (activeCanvas) {
          const actCtx = activeCanvas.getContext("2d");
          actCtx.globalCompositeOperation = "destination-out";
          actCtx.lineWidth = state.brushSize;
          actCtx.lineCap = "round";
          actCtx.lineJoin = "round";
          actCtx.beginPath();
          actCtx.moveTo(pos.x, pos.y);
        }
      } else if (state.activeTool === "pen" || state.activeTool === "brush") {
        drawCtx.beginPath();
        drawCtx.moveTo(pos.x, pos.y);
      }
    };

    const moveDraw = (e) => {
      if (!drawing) return;
      const pos = getMousePos(drawCanvas, e);

      if (state.activeTool === "eraser") {
        const activeCanvas = $(`#layer-${state.activeLayerName}`);
        if (activeCanvas) {
          const actCtx = activeCanvas.getContext("2d");
          actCtx.lineTo(pos.x, pos.y);
          actCtx.stroke();
        }
      } else if (state.activeTool === "pen") {
        drawCtx.lineTo(pos.x, pos.y);
        drawCtx.stroke();
      } else if (state.activeTool === "brush") {
        if (state.brushShape === "round") {
          drawCtx.lineTo(pos.x, pos.y);
          drawCtx.stroke();
        } else if (state.brushShape === "calligraphy") {
          const dist = Math.hypot(pos.x - lastX, pos.y - lastY);
          const steps = Math.ceil(dist / 2);
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = lastX + (pos.x - lastX) * t;
            const cy = lastY + (pos.y - lastY) * t;
            drawCtx.fillStyle = state.brushColor;
            drawCtx.save();
            drawCtx.translate(cx, cy);
            drawCtx.rotate(Math.PI / 4);
            drawCtx.fillRect(-state.brushSize / 2, -2, state.brushSize, 4);
            drawCtx.restore();
          }
        } else if (state.brushShape === "spray") {
          const radius = state.brushSize * 1.5;
          const density = 6;
          drawCtx.fillStyle = state.brushColor;
          for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            const sx = pos.x + Math.cos(angle) * r;
            const sy = pos.y + Math.sin(angle) * r;
            drawCtx.fillRect(sx, sy, 1.5, 1.5);
          }
        }
      } else if (state.activeTool === "line") {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.beginPath();
        drawCtx.moveTo(lastX, lastY);
        drawCtx.lineTo(pos.x, pos.y);
        drawCtx.stroke();
      } else if (state.activeTool === "rectangle") {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.beginPath();
        drawCtx.rect(lastX, lastY, pos.x - lastX, pos.y - lastY);
        drawCtx.stroke();
      } else if (state.activeTool === "circle") {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.beginPath();
        const r = Math.hypot(pos.x - lastX, pos.y - lastY);
        drawCtx.arc(lastX, lastY, r, 0, Math.PI * 2);
        drawCtx.stroke();
      }

      // Update positions for non-shape tools
      if (state.activeTool !== "line" && state.activeTool !== "rectangle" && state.activeTool !== "circle") {
        lastX = pos.x;
        lastY = pos.y;
      }
    };

    const endDraw = () => {
      if (!drawing) return;
      drawing = false;

      const activeCanvas = $(`#layer-${state.activeLayerName}`);
      if (activeCanvas) {
        const actCtx = activeCanvas.getContext("2d");

        if (state.activeTool === "eraser") {
          actCtx.globalCompositeOperation = "source-over";
        } else {
          actCtx.drawImage(drawCanvas, 0, 0);
          drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        }

        frame.layers[state.activeLayerName] = activeCanvas.toDataURL();
        saveProject();
      }
    };

    drawCanvas.addEventListener("mousedown", startDraw);
    drawCanvas.addEventListener("mousemove", moveDraw);
    drawCanvas.addEventListener("mouseup", endDraw);
    drawCanvas.addEventListener("mouseleave", endDraw);

    // Touch support mapping
    const handleTouch = (evt, mouseEvtName) => {
      const touch = evt.touches[0] || evt.changedTouches[0];
      if (!touch) return;
      const mouseEvt = new MouseEvent(mouseEvtName, {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      drawCanvas.dispatchEvent(mouseEvt);
    };
    drawCanvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleTouch(e, "mousedown"); }, { passive: false });
    drawCanvas.addEventListener("touchmove", (e) => { e.preventDefault(); handleTouch(e, "mousemove"); }, { passive: false });
    drawCanvas.addEventListener("touchend", (e) => { e.preventDefault(); handleTouch(e, "mouseup"); }, { passive: false });
  }

  // ------------------------- Playback Preview Loop -------------------------
  let previewTimer = null;
  let previewIndex = 0;
  let isPlayingPreview = false;

  function playPreview() {
    const canvas = $("#previewCanvas");
    if (!canvas) return;
    canvas.width = 640;
    canvas.height = 360;

    stopPreview();
    isPlayingPreview = true;
    previewIndex = 0;

    const run = () => {
      if (!isPlayingPreview) return;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const frame = state.project.frames[previewIndex];
      if (frame) {
        const layers = ["Background", "Character", "Foreground"];
        layers.forEach(layerName => {
          const dataUrl = frame.layers[layerName];
          if (dataUrl) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = dataUrl;
          }
        });
      }

      previewIndex = (previewIndex + 1) % state.project.frames.length;
      const delay = 1000 / state.playbackFps;
      previewTimer = setTimeout(run, delay);
    };
    run();
  }

  function stopPreview() {
    isPlayingPreview = false;
    clearTimeout(previewTimer);
  }

  function render() {
    const app = $("#app");
    if (!app) return;

    const topOffset = "var(--nxTopNavPx, 0px)";
    const stepIndex = STEPS.indexOf(state.step);

    app.innerHTML = `
      <div class="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/50 flex flex-col">
        <!-- Background Ambience -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
          <div class="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-indigo-600/5 blur-[120px] rounded-full"></div>
          <div class="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-purple-600/5 blur-[120px] rounded-full"></div>
        </div>

        <!-- App Navigation (below Nexus) -->
        <nav class="sticky z-40 glass border-b border-white/5 py-3 px-6 shadow-2xl" style="top:${topOffset}">
          <div class="max-w-[1440px] mx-auto flex items-center justify-between">
            <div class="flex items-center gap-4 group cursor-pointer" data-action="go-setup">
              <div class="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-all">
                <i class="fa-solid fa-clapperboard text-white text-lg"></i>
              </div>
              <div class="flex flex-col">
                <h1 class="text-xl font-outfit font-extrabold tracking-tight leading-none text-white">TOONSTUDIO</h1>
                <span class="text-[10px] font-bold tracking-[0.3em] text-indigo-400 uppercase">Production Suite</span>
              </div>
            </div>

            <div class="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              ${STEPS.map((s,i)=>`
                <button data-step="${s}" ${i>stepIndex ? "disabled" : ""} class="flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                  state.step===s ? "bg-indigo-600/20 text-white active-step-glow" :
                  i<stepIndex ? "text-indigo-400 hover:bg-white/5" : "text-slate-600"
                }">
                  <span class="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    state.step===s ? "bg-indigo-600 border-indigo-600" :
                    i<stepIndex ? "border-indigo-500/50" : "border-white/10"
                  }">${i+1}</span>
                  <span class="text-[11px] font-bold uppercase tracking-widest">${s}</span>
                </button>
              `).join("")}
            </div>

            <div class="flex items-center gap-4">
              <button data-action="open-setup" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em]">
                Setup
              </button>
              <button data-action="reset" class="text-[10px] font-black uppercase text-slate-500 hover:text-red-400 transition-colors tracking-[0.2em]">
                Reset Project
              </button>
              <div class="w-px h-8 bg-white/10 mx-2 hidden sm:block"></div>
              <div class="hidden sm:flex flex-col text-right">
                <span class="text-[10px] font-black uppercase text-slate-500 tracking-widest">Studio Status</span>
                <span class="text-xs font-mono text-emerald-400">READY</span>
              </div>
            </div>
          </div>
        </nav>

        <main class="max-w-[1440px] mx-auto p-4 md:p-8 relative z-10 flex-grow w-full">
          ${state.error ? `
            <div class="fixed z-[100] glass-thick border-red-500/50 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fadeIn"
                 style="top: calc(${topOffset} + 84px); left:50%; transform:translateX(-50%);">
              <i class="fa-solid fa-triangle-exclamation text-red-500"></i>
              <span class="text-sm font-bold text-slate-200">${escapeHtml(state.error)}</span>
              <button data-action="clear-error" class="ml-4 text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>` : ""}

          <div class="page-transition">
            ${renderStep()}
          </div>
        </main>
      </div>

      <!-- Setup Modal -->
      <div id="ts-setup-modal" class="fixed inset-0 z-[200] ${"hidden"}">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-action="close-setup"></div>
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-xl glass-thick rounded-3xl border border-white/10 shadow-2xl p-8">
          <div class="flex items-start justify-between gap-6">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">Connection</div>
              <div class="text-2xl font-outfit font-extrabold text-white mt-2">Studio Setup</div>
              <div id="ts-setup-desc" class="text-sm text-slate-400 mt-2">Enter your API key to enable rendering. Demo works without a key.</div>
            </div>
            <button data-action="close-setup" class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div class="mt-6 space-y-3">
            <div class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">API Key</div>
            <input id="ts-api-key" type="password" autocomplete="off"
              class="w-full px-4 py-3 rounded-2xl bg-slate-900/60 border border-white/10 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Paste key here" />
            <div class="flex items-center justify-between pt-2">
              <div class="text-xs text-slate-500">Status: <span class="text-emerald-400 font-mono">${escapeHtml(maskKey(state.apiKey))}</span></div>
              <button data-action="save-key" class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[11px]">
                SAVE
              </button>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div class="text-xs text-slate-500">Project data lives in this browser. Export to keep it safe.</div>
            <div class="flex gap-2">
              <button data-action="export" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em]">Export</button>
              <label class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer">
                Import<input id="ts-import" type="file" accept="application/json" class="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach canvas drawing and preview setups
    appEvents();
    if (state.step === "PRODUCTION") {
      setTimeout(initCanvasDrawing, 50);
    } else if (state.step === "PREVIEW") {
      setTimeout(playPreview, 50);
    } else {
      stopPreview();
    }
  }

  function renderStep() {
    const { project } = state;
    const disabled = state.loading ? "disabled" : "";
    const concept = escapeHtml(project.concept || "");
    const style = escapeHtml(project.style || "Pixar");

    if (state.step === "SETUP") {
      return `
        <div class="max-w-4xl mx-auto space-y-12 py-6">
          <div class="space-y-4 text-center">
            <h2 class="text-5xl md:text-7xl font-outfit font-extrabold tracking-tight text-white leading-tight">
              Bring your <span class="text-indigo-400">vision</span> to life.
            </h2>
            <p class="text-slate-400 text-base md:text-lg font-light max-w-xl mx-auto">
              A professional AI engine for high-fidelity cartoon production.
            </p>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between px-2">
              <span class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Cinematic Aesthetic</span>
              <span class="text-xs font-bold text-indigo-400">${style}</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              ${STYLES.map(s => `
                <button data-action="set-style" data-style="${s}"
                  class="p-4 rounded-xl border transition-all text-center relative overflow-hidden group ${
                    project.style === s ? "bg-indigo-600/10 border-indigo-500" : "bg-slate-900 border-white/5 hover:border-white/20"
                  }">
                  <span class="block text-[10px] font-bold tracking-tighter uppercase transition-colors relative z-10 ${
                    project.style === s ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                  }">${s}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <div class="glass p-1 rounded-3xl neon-border">
            <div class="bg-slate-900/50 rounded-3xl p-6 md:p-8 space-y-8">
              <textarea id="ts-concept"
                placeholder="Pitch your production concept... (e.g. A space-faring bounty hunter arrives at a neon-drenched oasis on a desert planet)"
                class="w-full h-32 md:h-48 bg-transparent border-none text-xl md:text-2xl font-light text-white focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-800">${concept}</textarea>

              <div class="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
                <button data-action="demo" class="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 ${state.loading ? "opacity-50" : ""}">
                  <i class="fa-solid fa-film text-indigo-400"></i>
                  Demo
                </button>
                <button data-action="architect" ${disabled} class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  Architect Script
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (state.step === "CHARACTERS") {
      const cards = (project.characters || []).map(c => `
        <div class="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
          <div class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Character</div>
          <div class="text-xl font-outfit font-extrabold text-white mt-1">${escapeHtml(c.name || "")}</div>
          <div class="text-xs text-slate-400 mt-2">${escapeHtml(c.description || "")}</div>
        </div>
      `).join("");

      return `
        <div class="max-w-5xl mx-auto space-y-6 py-4">
          <div class="flex items-end justify-between gap-6">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Casting</div>
              <div class="text-3xl font-outfit font-extrabold text-white mt-1">Characters</div>
              <div class="text-xs text-slate-400 mt-2">Your cast is ready. Proceed to storyboard when satisfied.</div>
            </div>
            <button data-action="next" data-next="STORYBOARD" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[10px] uppercase shadow-2xl shadow-indigo-600/20">
              Next: Storyboard
            </button>
          </div>

          <div class="grid md:grid-cols-3 gap-4">
            ${cards || `<div class="text-slate-500">No characters yet. Use Demo or Architect Script.</div>`}
          </div>
        </div>
      `;
    }

    if (state.step === "STORYBOARD") {
      const rows = (project.storyboard || []).map(s => `
        <div class="glass rounded-2xl p-5 border border-white/5">
          <div class="flex items-center justify-between">
            <div class="text-lg font-outfit font-extrabold text-white">${escapeHtml(s.title || "")}</div>
            <div class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Scene</div>
          </div>
          <div class="text-xs text-slate-400 mt-2">${escapeHtml(s.visual || "")}</div>
          <ul class="mt-3 space-y-1 text-xs">
            ${(s.beats || []).map(b => `<li class="text-slate-300 flex items-start gap-2"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/70 flex-shrink-0"></span><span>${escapeHtml(b)}</span></li>`).join("")}
          </ul>
        </div>
      `).join("");

      return `
        <div class="max-w-5xl mx-auto space-y-6 py-4">
          <div class="flex items-end justify-between gap-6">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Planning</div>
              <div class="text-3xl font-outfit font-extrabold text-white mt-1">Storyboard</div>
              <div class="text-xs text-slate-400 mt-2">Outline ready. Setup frames on the production line next.</div>
            </div>
            <button data-action="next" data-next="PRODUCTION" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[10px] uppercase shadow-2xl shadow-indigo-600/20">
              Next: Production
            </button>
          </div>

          <div class="grid gap-4">
            ${rows || `<div class="text-slate-500">No storyboard yet. Use Architect Script.</div>`}
          </div>
        </div>
      `;
    }

    if (state.step === "PRODUCTION") {
      const frames = project.frames || [];
      const frameOptions = frames.map((f, i) => `
        <div data-act="select-frame" data-index="${i}" class="group relative flex-shrink-0 w-24 aspect-video rounded-lg border overflow-hidden cursor-pointer transition-all ${
          state.activeFrameIndex === i ? "border-indigo-500 bg-indigo-600/10 shadow-lg" : "border-white/10 bg-slate-900 hover:border-white/20"
        }">
          <div class="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 group-hover:text-white z-10">
            Frame ${i + 1}
          </div>
          <!-- Tiny Layer Previews -->
          <div class="absolute inset-0 flex flex-col gap-[2px] p-1 opacity-20">
            <div class="h-1 bg-white/50 rounded"></div>
            <div class="h-1 bg-white/50 rounded"></div>
          </div>
        </div>
      `).join("");

      const layers = ["Background", "Character", "Foreground"];
      const layerOptions = layers.map(l => `
        <button data-act="select-layer" data-name="${l}" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
          state.activeLayerName === l ? "bg-indigo-600/20 border-indigo-500/50 text-white" : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
        }">
          <span class="flex items-center gap-2">
            <i class="fa-solid ${
              l === "Background" ? "fa-image" :
              l === "Character" ? "fa-user-astronaut" : "fa-cloud-moon"
            }"></i>
            ${l}
          </span>
          ${state.activeLayerName === l ? `<i class="fa-solid fa-check text-indigo-400"></i>` : ""}
        </button>
      `).join("");

      const tools = [
        { id: "pen", label: "Pen", icon: "fa-pen" },
        { id: "brush", label: "Brush", icon: "fa-brush" },
        { id: "eraser", label: "Eraser", icon: "fa-eraser" },
        { id: "line", label: "Line", icon: "fa-slash" },
        { id: "rectangle", label: "Rectangle", icon: "fa-square-o" },
        { id: "circle", label: "Circle", icon: "fa-circle-o" }
      ];

      return `
        <div class="max-w-6xl mx-auto space-y-6">
          <div class="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Animation Suite</div>
              <h2 class="text-3xl font-outfit font-extrabold text-white mt-1">Toon Creator Room</h2>
            </div>
            <button data-action="next" data-next="PREVIEW" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[10px] uppercase shadow-lg shadow-indigo-600/20">
              Next: Play & Export
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr_220px] gap-6">
            <!-- Left Panel: Drawing Palette -->
            <div class="glass p-5 rounded-2xl space-y-5">
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Toolbox</div>
              <div class="grid grid-cols-2 gap-2">
                ${tools.map(t => `
                  <button data-act="select-tool" data-tool="${t.id}" class="flex flex-col items-center gap-2 p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                    state.activeTool === t.id ? "bg-indigo-600/20 border-indigo-500 text-white" : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                  }">
                    <i class="fa-solid ${t.icon} text-base"></i>
                    ${t.label}
                  </button>
                `).join("")}
              </div>

              <!-- Brush Presets -->
              ${state.activeTool === "brush" ? `
                <div class="space-y-2 pt-3 border-t border-white/5 animate-fadeIn">
                  <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Brush Shapes</div>
                  <div class="grid grid-cols-3 gap-1">
                    ${["round", "calligraphy", "spray"].map(s => `
                      <button data-act="set-brush-shape" data-shape="${s}" class="py-1 rounded text-[8px] font-bold uppercase border transition-all ${
                        state.brushShape === s ? "bg-white/10 border-white/30 text-white" : "bg-black/50 border-transparent text-slate-500 hover:text-slate-300"
                      }">${s}</button>
                    `).join("")}
                  </div>
                </div>
              ` : ""}

              <div class="space-y-4 pt-3 border-t border-white/5">
                <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Size</span>
                  <span class="font-mono text-indigo-400">${state.brushSize}px</span>
                </div>
                <input id="brushSize" type="range" min="1" max="40" value="${state.brushSize}" class="w-full accent-indigo-500" />

                <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Opacity</span>
                  <span class="font-mono text-indigo-400">${Math.round(state.brushOpacity * 100)}%</span>
                </div>
                <input id="brushOpacity" type="range" min="0.1" max="1" step="0.05" value="${state.brushOpacity}" class="w-full accent-indigo-500" />
              </div>

              <!-- Color Palette -->
              <div class="space-y-3 pt-3 border-t border-white/5">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Swatches</div>
                <div class="grid grid-cols-6 gap-1.5">
                  ${["#ffffff", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#000000", "#475569"].map(c => `
                    <button data-act="set-brush-color" data-color="${c}" class="w-6 h-6 rounded-md border transition-all ${
                      state.brushColor === c ? "border-white scale-110" : "border-white/10 hover:scale-105"
                    }" style="background-color:${c}"></button>
                  `).join("")}
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[9px] uppercase font-bold text-slate-500">Custom:</span>
                  <input id="colorPicker" type="color" value="${state.brushColor}" class="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              </div>
            </div>

            <!-- Center Panel: The Stacked Canvas Draw Area -->
            <div class="flex flex-col items-center gap-4">
              <div class="relative w-full aspect-video bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <!-- Onion skin canvas -->
                <canvas id="onionCanvas" class="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-0"></canvas>
                <!-- Layers -->
                <canvas id="layer-Background" class="absolute inset-0 w-full h-full pointer-events-none z-10"></canvas>
                <canvas id="layer-Character" class="absolute inset-0 w-full h-full pointer-events-none z-20"></canvas>
                <canvas id="layer-Foreground" class="absolute inset-0 w-full h-full pointer-events-none z-30"></canvas>
                <!-- Interactive Draw Layer -->
                <canvas id="drawCanvas" class="absolute inset-0 w-full h-full z-40 cursor-crosshair"></canvas>
              </div>

              <!-- Animation Frame Strips Timeline -->
              <div class="w-full glass rounded-2xl p-4 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Timeline</div>
                  <div class="flex gap-2">
                    <button data-action="add-frame" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-wider">＋ Frame</button>
                    <button data-action="duplicate-frame" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-wider">⎗ Duplicate</button>
                    <button data-action="delete-frame" class="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">✕ Delete</button>
                  </div>
                </div>
                <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  ${frameOptions}
                </div>
              </div>
            </div>

            <!-- Right Panel: Layers List -->
            <div class="glass p-5 rounded-2xl space-y-5">
              <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Layers</div>
              <div class="space-y-2">
                ${layerOptions}
              </div>

              <div class="pt-4 border-t border-white/5 space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Onion Skin</span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input id="onionSkinToggle" type="checkbox" ${state.onionSkinOn ? "checked" : ""} class="sr-only peer" />
                    <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>
                <p class="text-[10px] text-slate-500 leading-snug">Displays the previous frame in transparency underneath your active workspace.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (state.step === "PREVIEW") {
      const list = project.storyboard.map((s, i) => `
        <div class="p-4 rounded-xl border border-white/5 bg-slate-900/40 text-xs">
          <div class="flex justify-between font-bold text-slate-300">
            <span>Scene ${i+1}: ${escapeHtml(s.title)}</span>
            <span class="text-[9px] uppercase tracking-wider text-indigo-400">Storyboard Ref</span>
          </div>
          <div class="text-slate-500 mt-1 font-mono">${escapeHtml(s.visual)}</div>
        </div>
      `).join("");

      return `
        <div class="max-w-5xl mx-auto space-y-6">
          <div class="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Preview Engine</div>
              <h2 class="text-3xl font-outfit font-extrabold text-white mt-1">Studio Screening Room</h2>
            </div>
            <button data-action="export" class="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[10px] uppercase shadow-lg shadow-indigo-600/20">
              Export Project
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div class="flex flex-col items-center gap-4">
              <div class="w-full aspect-video bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                <canvas id="previewCanvas" class="w-full h-full"></canvas>
              </div>

              <!-- Playback Control Center -->
              <div class="w-full glass rounded-2xl p-5 flex items-center justify-between gap-6">
                <div class="flex items-center gap-4">
                  <button data-act="play" class="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95">
                    <i class="fa-solid fa-play text-lg pl-1"></i>
                  </button>
                  <button data-act="pause" class="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-transform active:scale-95">
                    <i class="fa-solid fa-pause text-lg"></i>
                  </button>
                </div>

                <div class="flex items-center gap-4 flex-grow max-w-xs">
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Speed</span>
                  <input id="fpsRange" type="range" min="1" max="15" value="${state.playbackFps}" class="w-full accent-indigo-500" />
                  <span class="font-mono text-xs text-indigo-400 w-12">${state.playbackFps} FPS</span>
                </div>
              </div>
            </div>

            <!-- Script / Concept reference -->
            <div class="glass p-5 rounded-2xl space-y-5 h-fit">
              <div>
                <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Concept Pitch</div>
                <p class="text-sm text-slate-300 mt-2 font-light leading-relaxed">"${escapeHtml(project.concept)}"</p>
              </div>

              <div class="pt-4 border-t border-white/5 space-y-3">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">Storyboard Beats</div>
                <div class="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                  ${list || `<div class="text-slate-500">No scene outlines found.</div>`}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="max-w-4xl mx-auto py-16 text-center space-y-6">
        <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Stage</div>
        <div class="text-5xl font-outfit font-extrabold text-white">${escapeHtml(state.step)}</div>
        <div class="text-slate-400 max-w-2xl mx-auto">Demo assets are loaded. Export your project anytime.</div>
        <div class="flex items-center justify-center gap-4 pt-6">
          <button data-action="next" data-next="PREVIEW" class="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black tracking-widest text-[11px]">
            Go to Preview
          </button>
          <button data-action="export" class="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[11px]">
            Export Project
          </button>
        </div>
      </div>
    `;
  }

  let globalEventsBound = false;
  function initOnce() {
    if (globalEventsBound) return;
    globalEventsBound = true;

    // Click listeners
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action], [data-step], [data-act]");
      if (!btn) return;

      const step = btn.getAttribute("data-step");
      if (step) {
        if (canAdvanceTo(step)) setStep(step);
        return;
      }

      const action = btn.getAttribute("data-action");
      if (action) {
        if (action === "go-setup") return setStep("SETUP");
        if (action === "open-setup") return openSetup();
        if (action === "close-setup") return closeSetup();
        if (action === "save-key") return saveKey();
        if (action === "clear-error") return setError("");
        if (action === "reset") return resetProject();
        if (action === "demo") return demo();
        if (action === "architect") return generateScriptSuggestion();
        if (action === "export") return exportProject();
        if (action === "add-frame") return addFrame();
        if (action === "duplicate-frame") return duplicateFrame();
        if (action === "delete-frame") return deleteFrame();
        if (action === "next") {
          const nxt = btn.getAttribute("data-next");
          if (nxt) setStep(nxt);
          return;
        }
        if (action === "set-style") {
          const s = btn.getAttribute("data-style");
          if (s) {
            state.project.style = s;
            saveProject();
            render();
          }
          return;
        }
      }

      const act = btn.getAttribute("data-act");
      if (act) {
        if (act === "close-setup") return closeSetup();
        if (act === "select-frame") {
          const idx = parseInt(btn.getAttribute("data-index"));
          if (!isNaN(idx)) {
            state.activeFrameIndex = idx;
            render();
          }
        }
        if (act === "select-layer") {
          const name = btn.getAttribute("data-name");
          if (name) {
            state.activeLayerName = name;
            render();
          }
        }
        if (act === "select-tool") {
          const tool = btn.getAttribute("data-tool");
          if (tool) {
            state.activeTool = tool;
            render();
          }
        }
        if (act === "set-brush-shape") {
          const shape = btn.getAttribute("data-shape");
          if (shape) {
            state.brushShape = shape;
            render();
          }
        }
        if (act === "set-brush-color") {
          const color = btn.getAttribute("data-color");
          if (color) {
            state.brushColor = color;
            render();
          }
        }
        if (act === "play") {
          playPreview();
        }
        if (act === "pause") {
          stopPreview();
        }
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSetup();
    });
  }

  function appEvents() {
    initOnce();

    // Inputs selectors
    const ta = $("#ts-concept");
    if (ta) {
      ta.addEventListener("input", () => {
        state.project.concept = ta.value;
        saveProject();
      });
    }

    const file = $("#ts-import");
    if (file) {
      file.addEventListener("change", async () => {
        const f = file.files && file.files[0];
        if (f) await importProject(f);
        file.value = "";
      });
    }

    const brushSize = $("#brushSize");
    if (brushSize) {
      brushSize.addEventListener("input", (e) => {
        state.brushSize = parseInt(e.target.value);
        const valSpan = brushSize.previousElementSibling.lastElementChild;
        if (valSpan) valSpan.textContent = `${state.brushSize}px`;
      });
      brushSize.addEventListener("change", () => {
        render(); // redraw/sync palette values
      });
    }

    const brushOpacity = $("#brushOpacity");
    if (brushOpacity) {
      brushOpacity.addEventListener("input", (e) => {
        state.brushOpacity = parseFloat(e.target.value);
        const valSpan = brushOpacity.previousElementSibling.lastElementChild;
        if (valSpan) valSpan.textContent = `${Math.round(state.brushOpacity * 100)}%`;
      });
      brushOpacity.addEventListener("change", () => {
        render();
      });
    }

    const colorPicker = $("#colorPicker");
    if (colorPicker) {
      colorPicker.addEventListener("input", (e) => {
        state.brushColor = e.target.value;
      });
      colorPicker.addEventListener("change", () => {
        render();
      });
    }

    const onionSkinToggle = $("#onionSkinToggle");
    if (onionSkinToggle) {
      onionSkinToggle.addEventListener("change", (e) => {
        state.onionSkinOn = e.target.checked;
        render();
      });
    }

    const fpsRange = $("#fpsRange");
    if (fpsRange) {
      fpsRange.addEventListener("input", (e) => {
        state.playbackFps = parseInt(e.target.value);
        const fpsSpan = fpsRange.nextElementSibling;
        if (fpsSpan) fpsSpan.textContent = `${state.playbackFps} FPS`;
        if (isPlayingPreview) {
          playPreview(); // speed up / slow down loop
        }
      });
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Initial load
  render();
  if ((state.apiKey || '').trim()) serverLoadLatest();
})();
