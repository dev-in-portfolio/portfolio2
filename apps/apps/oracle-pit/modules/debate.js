  function startDebate() {
    if (state.isDebating || state.isLive) return;
    const d = (state.dilemma||"").trim();
    if (!d) return;
    state.isDebating = true;
    state.verdict = null;
    state.history = [];
    state.activeAgentId = null;
    save();
    render();

    let i = 0;
    const step = () => {
      const agent = AGENTS[i];
      state.activeAgentId = agent.id;
      state.tension = clamp(state.tension + 7, 0, 100);
      state.history.push({
        agentId: agent.id,
        agentName: agent.name,
        text: mkTurn(agent, d),
        ts: Date.now()
      });
      save();
      render();

      const sc = el("#opScroll");
      if (sc) sc.scrollTop = sc.scrollHeight;

      i++;
      if (i < AGENTS.length) {
        setTimeout(step, 650);
      } else {
        setTimeout(() => {
          generateVerdict();
          state.isDebating = false;
          state.activeAgentId = null;
          state.tension = clamp(state.tension + 5, 0, 100);
          save();
          render();
          const sc2 = el("#opScroll");
          if (sc2) sc2.scrollTop = sc2.scrollHeight;
        }, 700);
      }
    };
    setTimeout(step, 300);
  }

  function toggleExpand(agentId) {
    state.expandedAgentId = (state.expandedAgentId===agentId) ? null : agentId;
    render();
  }

  function setVote(agentId, vote) {
    state.manualVotes[agentId]=vote;
    save();
    render();
  }

  function updateSetting(agentId, key, value) {
    if (!state.agentSettings[agentId]) state.agentSettings[agentId]={voice:"Kore", speed:1, mode:"pro"};
    state.agentSettings[agentId][key]=value;
    save();
    render();
  }

  function esc(s) {
    return (s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function renderAgents() {
    return AGENTS.map(a => {
      const isActive = state.activeAgentId===a.id;
      const isExpanded = state.expandedAgentId===a.id;
      const vote = state.manualVotes[a.id] || (state.verdict && state.verdict.voteResults && state.verdict.voteResults[a.id]) || null;
      const settings = state.agentSettings[a.id] || {voice:a.voice||"Kore", speed:1, mode:"pro"};
      const scale = isActive ? 1.15 : 1;
      return `
        <div style="transform: scale(${scale}); transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)">
          <div class="flex flex-col items-center gap-3 transition-all duration-500 ${isExpanded ? 'glass p-4 rounded-3xl border-gray-700/50 -translate-y-2' : ''}">
            <button class="flex flex-col items-center gap-3 focus:outline-none w-full" data-act="toggleExpand" data-id="${a.id}" aria-expanded="${isExpanded}">
              <div class="
                w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl
                border-[2px] transition-all duration-700 bg-gray-950 relative overflow-visible
                ${isActive ? 'opacity-100 scale-100 pulse-active breathing' : 'opacity-40 grayscale-[40%] scale-90 hover:opacity-100 hover:scale-100 hover:grayscale-0'}
              ">
                <span class="relative z-10 drop-shadow-2xl">${a.avatar}</span>
                ${vote ? `
                  <div class="absolute -top-1 -right-1 px-2.5 py-1 rounded-lg text-[9px] font-black border shadow-2xl z-20 ${
                    vote === 'YES' ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' :
                    vote === 'NO' ? 'bg-rose-500 text-black border-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.5)]' :
                    'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                  }">${vote}</div>` : ''}
              </div>
              <div class="text-center px-2 space-y-1">
