  function render() {
    initAgentSettings();
    const setupModal = state.showSetup ? `
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70" data-act="closeSetup" aria-hidden="true"></div>
        <div class="relative w-full max-w-2xl glass rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
          <div class="bg-black/40 border-b border-white/5 p-5 flex items-center justify-between">
            <div class="text-[10px] font-mono text-cyan-300/80 tracking-[0.35em] uppercase">Setup</div>
            <button class="px-4 py-2 rounded-2xl text-[10px] font-mono uppercase tracking-widest border bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-cyan-500/40" data-act="closeSetup">Close</button>
          </div>
          <div class="p-6 md:p-8 space-y-5">
            <div class="text-lg md:text-xl font-sync uppercase tracking-tight glow-cyan">How Oracle Pit Works</div>
            <div class="text-sm text-gray-300 leading-relaxed">
              Paste a dilemma, hit <span class="text-cyan-300 font-mono">DEBATE</span>, and the Council generates 5 perspectives + a verdict.
              Expand any agent to override their stance/voice and re-run.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div class="text-[10px] font-mono uppercase tracking-widest text-gray-400">Status</div>
                <div class="mt-2 text-sm"><span class="text-emerald-300">Connected</span> • <span class="text-cyan-300">Ready</span> • <span class="text-pink-300">Synced</span></div>
                <div class="mt-2 text-[12px] text-gray-400">Local-first today. Backend-ready later.</div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div class="text-[10px] font-mono uppercase tracking-widest text-gray-400">Backup</div>
                <div class="mt-2 text-[12px] text-gray-300">Your Council log lives in this browser. Use <span class="text-cyan-300 font-mono">Export JSON</span> to keep it safe.</div>
              </div>
              
              <div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div class="text-[10px] font-mono uppercase tracking-widest text-gray-400">API Key</div>
                <div class="mt-2 text-[12px] text-gray-300">
                  Optional. Stored locally on this device for Live mode.
                  <span class="text-gray-400">(No backend required.)</span>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <input data-act="apikey" type="password" autocomplete="off" spellcheck="false"
                    class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-gray-100 text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                    placeholder="Paste your key (saved locally)" value="${escapeHTML(state.apiKeyDraft || "")}">
                  <button data-act="saveKey" class="px-4 py-2 rounded-xl text-[11px] font-mono uppercase tracking-widest border bg-black/40 border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/40">
                    Save
                  </button>
                </div>
                <div class="mt-2 text-[11px] text-gray-400">
                  Saved: <span class="text-gray-200 font-mono">${state.apiKey ? maskKey(state.apiKey) : "—"}</span>
                </div>
                ${state.apiKeyError ? `<div class="mt-2 text-[11px] text-pink-300">${escapeHTML(state.apiKeyError)}</div>` : ``}
              </div>
<div class="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div class="text-[10px] font-mono uppercase tracking-widest text-gray-400">Pro Move</div>
                <div class="mt-2 text-[12px] text-gray-300">Try a <span class="text-gray-100 font-mono">SAMPLE</span> first to see the vibe, then drop your real dilemma.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ` : ``;

    const hud = `
      <div class="min-h-screen w-full flex flex-col items-center p-4 md:p-8 relative">
        <header class="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-gray-900/20 p-6 rounded-3xl border border-white/5 backdrop-blur-md relative overflow-hidden aurora-layered">
          <div class="aurora-sweep" aria-hidden="true"></div>
          <div class="flex flex-col">
            <div class="flex items-center gap-4">
              <div class="w-3 h-3 rounded-full ${state.isDebating ? 'bg-rose-500 animate-ping' : 'bg-gray-700'}"></div>
              <h1 class="text-3xl md:text-5xl font-sync font-bold tracking-tighter uppercase glow-cyan">
                Council <span class="text-cyan-400">Chaos</span>
              </h1>
            </div>
            <p class="text-[10px] text-gray-500 font-mono tracking-[0.4em] uppercase mt-2">Collective Intelligence Node v3.5</p>
          </div>

          <div class="flex flex-col w-full md:w-64 gap-2">
            <div class="flex justify-between text-[9px] font-mono text-gray-400 uppercase tracking-widest">
              <span>Aggression Tension</span>
              <span class="${state.tension > 75 ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}">${Math.floor(state.tension)}%</span>
            </div>
            <div class="h-1.5 w-full bg-black rounded-full overflow-hidden border border-white/10">
              <div class="h-full transition-all duration-700 ease-out ${state.tension > 75 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'}"
                   style="width:${state.tension}%"></div>
            </div>
          </div>

          <div class="flex gap-4">
            <button id="opHow" class="px-6 py-3 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-300 hover:text-white hover:border-cyan-500/30 transition-all">
              Setup
            </button>
          </div>
        </header>

        <div class="w-full max-w-7xl grid grid-cols-2 md:grid-cols-5 gap-6 mb-16 px-4">
          ${renderAgents()}
        </div>

        <div class="w-full max-w-5xl glass rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
          <div class="bg-black/40 border-b border-white/5 p-4 flex justify-between items-center px-8">
            <div class="flex gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-rose-500/30"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-emerald-500/30"></div>
            </div>
            <div class="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">Neural Data Stream</div>
            <div class="text-[10px] font-mono text-cyan-500/50">SECURE_LINK: ${Math.random().toString(16).slice(2,10)}</div>
          </div>

          <div id="opScroll" class="h-[550px] overflow-y-auto p-8 md:p-12 space-y-8 no-scrollbar scroll-smooth">
            ${renderHistory()}
            ${renderVerdict()}
          </div>
        </div>

        ${renderFooterControls()}
        ${setupModal}
      </div>
    `;
    root().innerHTML = setupModal + hud;

    const dilemmaInput = el("#opDilemma");
    if (dilemmaInput) {
      dilemmaInput.addEventListener("input", (e)=> {
        state.dilemma = e.target.value;
        save();
        const btn = el("#opDebateBtn");
        if (btn) {
          btn.disabled = state.isDebating || !state.dilemma.trim();
          btn.className = "px-12 py-5 rounded-3xl font-sync font-bold uppercase tracking-[0.2em] transition-all " + ((state.isDebating || !state.dilemma.trim()) ? "bg-gray-800 text-gray-600" : "bg-cyan-500 text-black hover:scale-105 hover:bg-cyan-400");
          btn.textContent = state.isDebating ? "SIMULATING..." : "DEBATE";
        }
      });
      dilemmaInput.addEventListener("keydown", (e)=> {
        if (e.key==="Enter") startDebate();
      });
    }

    const debateBtn = el("#opDebateBtn");
    if (debateBtn) debateBtn.addEventListener("click", startDebate);

    const expBtn = el("#opExport");
    if (expBtn) expBtn.addEventListener("click", exportJSON);

    const imp = el("#opImport");
    if (imp) imp.addEventListener("change", (e)=> {
      const f = e.target.files && e.target.files[0];
      if (f) importJSON(f);
      e.target.value="";
    });

    document.querySelectorAll("[data-act]").forEach(node => {
      node.addEventListener("click", (e)=> {
        const t = e.currentTarget;
        const act = t.getAttribute("data-act");
        if (act==="toggleExpand") toggleExpand(t.getAttribute("data-id"));
        if (act==="vote") setVote(t.getAttribute("data-id"), t.getAttribute("data-vote"));
        if (act==="mode") updateSetting(t.getAttribute("data-id"), "mode", t.getAttribute("data-mode"));
        if (act==="sample") { state.dilemma = t.getAttribute("data-sample"); save(); render(); }
        if (act==="closeSetup") { state.showSetup = false; render(); }

        if (act==="saveKey") {
          const inp = document.querySelector("input[data-act='apikey']");
          const val = inp ? inp.value : "";
          saveApiKey(val);
          toast("Key saved locally.");
          render();
        }
      });
    });

    document.querySelectorAll("select[data-act='voice']").forEach(node => {
      node.addEventListener("change", (e)=> {
        const t = e.currentTarget;
        updateSetting(t.getAttribute("data-id"), "voice", t.value);
      });
    });

    document.querySelectorAll("input[type='range'][data-act='speed']").forEach(node => {
      node.addEventListener("input", (e)=> {
        const t = e.currentTarget;
        updateSetting(t.getAttribute("data-id"), "speed", parseFloat(t.value));
      });
    });

    const setupBtn = el("#opHow");
    if (setupBtn) setupBtn.addEventListener("click", ()=> { state.showSetup = true; render(); });

    document.querySelectorAll("[data-act='closeSetup']").forEach(node => {
      node.addEventListener("click", ()=> { state.showSetup = false; render(); });
    });
  }

  initAgentSettings();
  load();
  document.addEventListener("DOMContentLoaded", () => {
    render();
  });
})();
