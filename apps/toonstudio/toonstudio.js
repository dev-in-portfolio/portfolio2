
/* ToonStudio Pro — Vanilla Static Runtime (no build step)
   - Preserves original Tailwind/FontAwesome styling & layout
   - Local-first: key stored in localStorage
   - Demo mode works offline
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
    },
    demoOn: false,
  };

  function loadProject() {
    try {
      const raw = localStorage.getItem(LS.project);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveProject() {
    try {
      localStorage.setItem(LS.project, JSON.stringify(state.project));
    scheduleServerSync();
      scheduleServerSync();
    } catch {}
  }

// ------------------------- Backend Sync (optional) -------------------------
// Uses Netlify Functions via /api/* redirect. Silent fallback if offline/unconfigured.
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
    state.project = { style: "Pixar", concept: "", characters: [], storyboard: [] };
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
    saveProject();
    setStep("CHARACTERS");
  }

  async function generateScriptSuggestion() {
    // Backend-present UX: behave cleanly even if offline.
    // For now: in-browser call if key is present; otherwise deterministic demo suggestion.
    const concept = state.project.concept.trim();
    if (!concept) return setError("Add a concept first.");
    state.loading = true; render();

    try {
      if (!state.apiKey) {
        // Offline-safe suggestion
        state.project.storyboard = [
          { id: "s1", title: "Setup", visual: "Introduce tone and protagonist.", beats: ["Hook", "Character", "Goal"] },
          { id: "s2", title: "Conflict", visual: "Obstacle escalates.", beats: ["Complication", "Choice", "Risk"] },
          { id: "s3", title: "Payoff", visual: "Resolution with Pixar-style heart.", beats: ["Climax", "Emotion", "Tag"] },
        ];
        saveProject();
        setStep("STORYBOARD");
        return;
      }

      // Call Gemini REST directly (works if browser allows). If blocked, we fail gracefully.
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
      saveProject();
      setStep("STORYBOARD");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      state.loading = false; render();
    }
  }

  function exportProject() {
    // Guard against double-taps / duplicated click events on mobile.
    const now = Date.now();
    if (state.__exportCooldownUntil && now < state.__exportCooldownUntil) return;
    state.__exportCooldownUntil = now + 2000;

    // Demo mode does not export. Prompt the user to add their own key and create a project.
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
        storyboard: Array.isArray(parsed.storyboard) ? parsed.storyboard : []
      };
      saveProject();
      render();
    } catch (e) {
      setError("Import failed");
    }
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

        <main class="max-w-[1440px] mx-auto p-4 md:p-10 relative z-10 flex-grow w-full">
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

    // show modal if requested via state
    // Attach events
    appEvents();
  }

  function renderStep() {
    const { project } = state;
    const disabled = state.loading ? "disabled" : "";
    const concept = escapeHtml(project.concept || "");
    const style = escapeHtml(project.style || "Pixar");

    if (state.step === "SETUP") {
      return `
        <div class="max-w-4xl mx-auto space-y-16 py-12">
          <div class="space-y-6 text-center">
            <h2 class="text-6xl md:text-8xl font-outfit font-extrabold tracking-tight text-white leading-tight">
              Bring your <span class="text-indigo-500">vision</span> to life.
            </h2>
            <p class="text-slate-400 text-lg md:text-xl font-light max-w-2xl mx-auto">
              A professional AI engine for high-fidelity cartoon production.
            </p>
          </div>

          <div class="space-y-6">
            <div class="flex items-center justify-between px-2">
              <span class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Cinematic Aesthetic</span>
              <span class="text-xs font-bold text-indigo-400">${style}</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              ${STYLES.map(s => `
                <button data-action="set-style" data-style="${s}"
                  class="p-6 rounded-2xl border transition-all text-center relative overflow-hidden group ${
                    project.style === s ? "bg-indigo-600/10 border-indigo-500" : "bg-slate-900 border-white/5 hover:border-white/20"
                  }">
                  <span class="block text-[11px] font-bold tracking-tighter uppercase transition-colors relative z-10 ${
                    project.style === s ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                  }">${s}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <div class="glass p-1 rounded-[42px] neon-border">
            <div class="bg-slate-900/50 rounded-[40px] p-8 md:p-12 space-y-10">
              <textarea id="ts-concept"
                placeholder="Pitch your production concept... (e.g. A space-faring bounty hunter arrives at a neon-drenched oasis on a desert planet)"
                class="w-full h-40 md:h-60 bg-transparent border-none text-2xl md:text-4xl font-light text-white focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-800">${concept}</textarea>

              <div class="flex flex-col sm:flex-row gap-6 pt-10 border-t border-white/5">
                <button data-action="demo" class="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-4 transition-all active:scale-95 ${state.loading ? "opacity-50" : ""}">
                  <i class="fa-solid fa-film text-indigo-400"></i>
                  Demo
                </button>
                <button data-action="architect" ${disabled} class="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                  Architect Script
                </button>
              </div>

              <div class="pt-6 text-xs text-slate-500 flex items-center justify-between">
                <span>Status: <span class="text-emerald-400 font-mono">CONNECTED</span></span>
                <button data-action="open-setup" class="text-indigo-300 hover:text-white font-black tracking-[0.2em] uppercase text-[10px]">Setup</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (state.step === "CHARACTERS") {
      const cards = (project.characters || []).map(c => `
        <div class="glass rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all">
          <div class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Character</div>
          <div class="text-2xl font-outfit font-extrabold text-white mt-2">${escapeHtml(c.name || "")}</div>
          <div class="text-sm text-slate-400 mt-3">${escapeHtml(c.description || "")}</div>
        </div>
      `).join("");

      return `
        <div class="max-w-5xl mx-auto space-y-8 py-8">
          <div class="flex items-end justify-between gap-6">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Casting</div>
              <div class="text-4xl md:text-5xl font-outfit font-extrabold text-white mt-2">Characters</div>
              <div class="text-sm text-slate-400 mt-3">Your cast is ready. Proceed to storyboard when satisfied.</div>
            </div>
            <button data-action="next" data-next="STORYBOARD" class="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[11px] shadow-2xl shadow-indigo-600/20">
              Next: Storyboard
            </button>
          </div>

          <div class="grid md:grid-cols-3 gap-6">
            ${cards || `<div class="text-slate-500">No characters yet. Use Demo or Architect Script.</div>`}
          </div>
        </div>
      `;
    }

    if (state.step === "STORYBOARD") {
      const rows = (project.storyboard || []).map(s => `
        <div class="glass rounded-3xl p-6 border border-white/5">
          <div class="flex items-center justify-between">
            <div class="text-xl font-outfit font-extrabold text-white">${escapeHtml(s.title || "")}</div>
            <div class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Scene</div>
          </div>
          <div class="text-sm text-slate-400 mt-3">${escapeHtml(s.visual || "")}</div>
          <ul class="mt-4 space-y-2 text-sm">
            ${(s.beats || []).map(b => `<li class="text-slate-300 flex items-start gap-3"><span class="mt-1 w-2 h-2 rounded-full bg-indigo-500/70"></span><span>${escapeHtml(b)}</span></li>`).join("")}
          </ul>
        </div>
      `).join("");

      return `
        <div class="max-w-5xl mx-auto space-y-8 py-8">
          <div class="flex items-end justify-between gap-6">
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Planning</div>
              <div class="text-4xl md:text-5xl font-outfit font-extrabold text-white mt-2">Storyboard</div>
              <div class="text-sm text-slate-400 mt-3">Outline ready. Production and preview can be wired next.</div>
            </div>
            <button data-action="next" data-next="PRODUCTION" class="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest text-[11px] shadow-2xl shadow-indigo-600/20">
              Next: Production
            </button>
          </div>

          <div class="grid gap-6">
            ${rows || `<div class="text-slate-500">No storyboard yet. Use Architect Script.</div>`}
          </div>
        </div>
      `;
    }

    // Placeholder for later stages (kept visually consistent)
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

  function appEvents() {
    // Main click handlers
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action], [data-step]");
      if (!btn) return;

      const step = btn.getAttribute("data-step");
      if (step) {
        if (canAdvanceTo(step)) setStep(step);
        return;
      }

      const action = btn.getAttribute("data-action");
      if (!action) return;

      if (action === "go-setup") return setStep("SETUP");
      if (action === "open-setup") return openSetup();
      if (action === "close-setup") return closeSetup();
      if (action === "save-key") return saveKey();
      if (action === "clear-error") return setError("");
      if (action === "reset") return resetProject();
      if (action === "demo") return demo();
      if (action === "architect") return generateScriptSuggestion();
      if (action === "export") return exportProject();
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
    }, { passive: true });

    // textarea persistence
    const ta = $("#ts-concept");
    if (ta) {
      ta.addEventListener("input", () => {
        state.project.concept = ta.value;
        saveProject();
      }, { passive: true });
    }

    // import
    const file = $("#ts-import");
    if (file) {
      file.addEventListener("change", async () => {
        const f = file.files && file.files[0];
        if (f) await importProject(f);
        file.value = "";
      });
    }

    // setup modal close on escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSetup();
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Initial render
  render();
if ((state.apiKey || '').trim()) serverLoadLatest();

  // Show setup if key absent and user tries to use key-required flows (handled by UI)
})();
