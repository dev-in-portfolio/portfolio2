  function renderHistory() {
    if (state.history.length===0) {
      return `
        <div class="h-full flex flex-col items-center justify-center text-center py-20 opacity-20 group">
          <div class="w-20 h-20 mb-8 text-gray-500 group-hover:text-cyan-500 transition-colors duration-1000 floating">⟁</div>
          <p class="text-xs font-mono tracking-[0.5em] uppercase text-gray-600">Awaiting Input</p>
        </div>
      `;
    }
    return state.history.map(h => {
      const agent = AGENTS.find(a=>a.id===h.agentId);
      return `
        <div class="animate-in slide-in-from-bottom-2 duration-500">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">${agent ? agent.avatar : "?"}</div>
              <div>
                <div class="text-[10px] font-sync uppercase tracking-widest text-gray-200">${esc(h.agentName)}</div>
                <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-gray-600">${esc(agent ? agent.role : "")}</div>
              </div>
            </div>
            <div class="text-[9px] font-mono text-gray-700">${new Date(h.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          <div class="bg-gray-900/20 border border-white/5 rounded-3xl p-5 text-gray-300">
            <p class="text-sm md:text-base leading-relaxed">${esc(h.text)}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderVerdict() {
    if (!state.verdict) return "";
    const vr = state.verdict.voteResults || {};
    return `
      <div class="mt-8 p-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5">
        <div class="text-[10px] font-sync text-cyan-500/60 uppercase tracking-[1em] mb-4">Council Verdict</div>
        <p class="text-white font-medium mb-5">${esc(state.verdict.summary)}</p>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          ${AGENTS.map(a => {
            const v = vr[a.id] || "MAYBE";
            const pill = v==="YES" ? "bg-emerald-500 text-black" : v==="NO" ? "bg-rose-500 text-black" : "bg-yellow-400 text-black";
            return `<div class="p-3 rounded-2xl bg-black/30 border border-white/5">
              <div class="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2">${esc(a.name)}</div>
              <div class="inline-block px-2 py-1 rounded-lg text-[10px] font-black ${pill}">${v}</div>
            </div>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderFooterControls() {
    return `
      <div class="w-full max-w-5xl mt-10">
        <div class="glass rounded-[2.5rem] border border-white/10 p-8 md:p-10">
          <div class="flex flex-col md:flex-row gap-4 md:items-center">
            <div class="relative flex-1">
              <input id="opDilemma" type="text" value="${esc(state.dilemma)}"
                placeholder="Inject dilemma into the matrix..."
                class="w-full bg-black/40 border border-white/10 rounded-3xl px-8 py-5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-all font-mono text-sm"
              />
              <div class="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-700 uppercase select-none">READY_INPUT</div>
            </div>
            <button id="opDebateBtn"
              class="px-12 py-5 rounded-3xl font-sync font-bold uppercase tracking-[0.2em] transition-all ${
                state.isDebating || !state.dilemma.trim() ? 'bg-gray-800 text-gray-600' : 'bg-cyan-500 text-black hover:scale-105 hover:bg-cyan-400'
              }" ${state.isDebating || !state.dilemma.trim() ? 'disabled' : ''}>
              ${state.isDebating ? 'SIMULATING...' : 'DEBATE'}
            </button>
          </div>

          <div class="mt-6 flex flex-col gap-4">
            <div class="flex flex-wrap gap-2">
              ${SAMPLE_DILEMMAS.map((s,i)=>`
                <button data-act="sample" data-sample="${esc(s)}"
                  class="px-4 py-2 rounded-2xl text-[10px] font-mono uppercase tracking-widest border transition-all bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-cyan-500/40">
                  SAMPLE ${i+1}
                </button>
