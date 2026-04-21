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
