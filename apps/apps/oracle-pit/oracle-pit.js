/* Oracle Pit — Vanilla Static Conversion
   Notes: This file intentionally contains no imports/bundler assumptions.
*/
(function() {

    const KEY_STORE = "oracle_pit_api_key";
const AGENTS = [
  {
    "id": "INVESTOR",
    "name": "Chadwick Sterling",
    "role": "Ruthless VC Investor",
    "color": "emerald-400",
    "voice": "Kore",
    "avatar": "📈",
    "description": "Calculates everything in terms of ROI and market volatility. Zero empathy for emotional arguments."
  },
  {
    "id": "ARTIST",
    "name": "Luna Void",
    "role": "Chaotic Neo-Expressionist",
    "color": "pink-500",
    "voice": "Puck",
    "avatar": "🎨",
    "description": "Values soul, suffering, and the aesthetic beauty of burning bridges. Thinks money is a cage."
  },
  {
    "id": "CONSPIRACIST",
    "name": "Agent X-44",
    "role": "Paranoid Whistleblower",
    "color": "orange-500",
    "voice": "Charon",
    "avatar": "🛸",
    "description": "Sees surveillance, government agendas, and digital simulation traps in every decision."
  },
  {
    "id": "PHILOSOPHER",
    "name": "Aurelius 2.0",
    "role": "Stoic Digital Ancient",
    "color": "blue-400",
    "voice": "Fenrir",
    "avatar": "🏛️",
    "description": "Asks \"What is the nature of the self?\" and uses metaphors about rivers, stars, and entropy."
  },
  {
    "id": "HYPEBRO",
    "name": "Zack \"Moon\" King",
    "role": "Web3 Hype Architect",
  const state = {
    dilemma: "",
    isDebating: false,
    isLive: false,
    tension: 42,
    activeAgentId: null,
    expandedAgentId: null,
    history: [], // {agentId, agentName, text, ts}
    verdict: null, // {summary, voteResults}
    manualVotes: {},
    agentSettings: {},
    toast: null,
    showSetup: false,
    apiKey: "",
    apiKeyDraft: "",
    apiKeySavedAt: null,
    apiKeyError: null,
  };

// ------------------------- Backend Sync (optional) -------------------------
// Uses shared appdata persistence when this root exposes /api/appdata.
const APPDATA_APP = "oracle-pit";
let _syncTimer = null;

function buildServerPayload() {
  return {
    kind: "oracle_pit_state_v1",
    ts: Date.now(),
    dilemma: state.dilemma,
    tension: state.tension,
    history: state.history,
    verdict: state.verdict,
    manualVotes: state.manualVotes,
    agentSettings: state.agentSettings,
  };
}

async function serverSaveNow() {
  const clientId = (state.apiKey || "").trim();
  if (!clientId) return;
  try {
    await window.NexusAppData?.save?.(APPDATA_APP, buildServerPayload(), { clientId });
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
    const data = await window.NexusAppData?.loadLatest?.(APPDATA_APP, { clientId });
    const p = data?.payload;
    if (!p || typeof p !== "object") return;

    state.dilemma = p.dilemma ?? state.dilemma;
    state.tension = typeof p.tension === "number" ? p.tension : state.tension;
    state.history = Array.isArray(p.history) ? p.history : state.history;
    state.verdict = p.verdict ?? state.verdict;
    state.manualVotes = p.manualVotes || state.manualVotes;
    state.agentSettings = p.agentSettings || state.agentSettings;

    save();
    render();
  } catch (_) {}
}


  function initAgentSettings() {
    AGENTS.forEach(a => {
      state.agentSettings[a.id] = state.agentSettings[a.id] || {
        voice: a.voice || "Kore",
        speed: 1.0,
        mode: "pro"
      };
    });
  }

  function escapeHTML(s) {
    return String(s ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function maskKey(k) {
    if (!k) return "";
    const s = String(k).trim();
  function generateVerdict() {
    const voteResults = {};
    let yes=0,no=0,maybe=0;
    AGENTS.forEach(a => {
      const forced = state.manualVotes[a.id];
      let v = forced;
      if (!v) {
        const text = (state.dilemma||"").toLowerCase();
        const bias = (text.includes("quit")||text.includes("ship")) ? "YES" :
                     (text.includes("wait")||text.includes("stable")) ? "NO" : "MAYBE";
        const roll = (a.id.charCodeAt(0)+Math.floor(state.tension)) % 3;
        v = roll===0 ? bias : (roll===1 ? "MAYBE" : (bias==="YES"?"NO":"YES"));
      }
      voteResults[a.id]=v;
      if (v==="YES") yes++; else if (v==="NO") no++; else maybe++;
    });
    const decision = yes>no ? "YES" : no>yes ? "NO" : "MAYBE";
    const summary = decision==="YES"
      ? "Verdict: Do it. The Council wants velocity — but stage the risk."
      : decision==="NO"
        ? "Verdict: Hold. Secure runway, then strike with better positioning."
        : "Verdict: Split the difference. Pilot small, learn fast, decide in 14 days.";
    state.verdict={summary, voteResults};
  }

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
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const d = parsed.data || parsed;
        state.dilemma = d.dilemma || "";
        state.tension = typeof d.tension === "number" ? d.tension : 42;
        state.history = Array.isArray(d.history) ? d.history : [];
        state.verdict = d.verdict || null;
        state.manualVotes = d.manualVotes || {};
        state.agentSettings = d.agentSettings || state.agentSettings;
        save();
        setToast("Imported.");
        render();
      } catch (e) {
        setToast("Import failed.");
      }
    };
    reader.readAsText(file);
  }

  function mkTurn(agent, dilemma) {
    const seed = (dilemma + agent.id).split("").reduce((a,c)=>a + c.charCodeAt(0), 0);
    const r = seed % 5;
    const lines = {
      INVESTOR: [
        "ROI first: take the path that compounds optionality.",
        "Ship now. Momentum is leverage. Perfect is expensive.",
        "Stability is runway. Six months buys better positioning.",
        "If it doesn't monetize or unlock distribution, it’s a hobby."
      ],
      ARTIST: [
        "Burn the map. Choose the thing that feels alive.",
        "Perfection is fear in a tuxedo. Release it.",
        "Take the weird path. The story matters more than the salary.",
        "Comfort is a cage. Rip a hole in it."
      ],
      CONSPIRACIST: [
        "Ask who benefits. Then assume it’s worse than you think.",
        "If the choice feels forced, it’s engineered.",
        "The safest option is usually the trap with better branding.",
        "Follow the incentives. They never lie."
      ],
      ENGINEER: [
        "Define constraints, ship an MVP, and iterate with metrics.",
        "Reduce risk: stage it. Partial refactor, not a rewrite.",
        "Make it runnable as-shipped. Then optimize.",
        "Failure modes first. Then the pretty."
      ],
      PRIEST: [
        "Choose what you can live with at 3am.",
        "Your values are the backend. Keep them online.",
        "The cleanest choice is the one that reduces harm.",
        "Listen to the quiet yes."
      ]
    };
    const bucket = lines[agent.id] || ["State your dilemma. The Council will decide."];
    return bucket[r % bucket.length] + " — " + agent.role + ".";
  }
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
