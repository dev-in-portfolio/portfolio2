(() => {
  "use strict";

  const log = console.error;

  // ------------------------------------------------------------
  // LingoLive AI — vanilla runtime that preserves the original TSX/Tailwind UI.
  // No build step required. Local-first; Live mode uses user's key.
  // ------------------------------------------------------------


  const K = {
    mode: "lingo_app_mode",
    apiKey: "lingo_user_api_key",
    apiKeyValid: "lingo_user_api_key_valid",
    seenIntro: "lingo_seen_intro",
    difficult: "lingo_difficult_words",
    messages: "lingo_messages_v2",
  };

  /** @type {{code:string,name:string,flag:string,voice:string}[]} */
  const LANGUAGES = [
    { code: "es", name: "Spanish", flag: "🇪🇸", voice: "Puck" },
    { code: "fr", name: "French", flag: "🇫🇷", voice: "Kore" },
    { code: "de", name: "German", flag: "🇩🇪", voice: "Charon" },
    { code: "ja", name: "Japanese", flag: "🇯🇵", voice: "Fenrir" },
    { code: "it", name: "Italian", flag: "🇮🇹", voice: "Zephyr" },
    { code: "en", name: "English", flag: "🇺🇸", voice: "Puck" },
  ];

  const LEVELS = ["Beginner", "Intermediate", "Advanced"];

  const DEMO_TURNS = [
    {
      user: "Hi! I'm learning.",
      model: "Awesome — I’m your language partner. Want to practice a short phrase together?",
      feedback: {
        originalText: "Hi! I'm learning.",
        improvement: "Clear and confident — only soften the final 'ing' a little.",
        correction: "Try: “I’m LEARN-ing.” (light 'ng')",
        score: 92,
      },
    },
    {
      user: "How do I say: Where is the bathroom?",
      model: "Great survival phrase. Say it slowly first, then naturally. Ready?",
      feedback: {
        originalText: "Where is the bathroom?",
        improvement: "The stress should land on “BATH-” not “-room”.",
        correction: "Try: “WHERE is the BATH-room?”",
        score: 84,
      },
    },
    {
      user: "Where is the bathroom?",
      model: "Nice! Now speed it up just a bit — keep the stress on BATH.",
      feedback: {
        originalText: "Where is the bathroom?",
        improvement: "Better! Watch the 'th' in “bath”.",
        correction: "Tip: tongue lightly between teeth for “th”.",
        score: 88,
      },
    },
    {
      user: "Thank you!",
      model: "Perfect. Next: ask for help — “Can you help me?”",
      feedback: {
        originalText: "Thank you!",
        improvement: "Great. If you want it warmer, smile while you say it.",
        correction: "Try: “Thank you!” (with a little lift)",
        score: 96,
      },
    },
  ];

  // ------------------------- DOM -------------------------
  const $ = (id) => document.getElementById(id);
  const introGate = $("introGate");
  const introLivePanel = $("introLivePanel");
  const introError = $("introError");
  const inpIntroKey = $("inpIntroKey");
  const btnIntroContinue = $("btnIntroContinue");

  const historyOverlay = $("historyOverlay");
  const labSidebar = $("labSidebar");
  const labList = $("labList");
  const labCount = $("labCount");

  const btnOpenHistory = $("btnOpenHistory");
  const btnCloseHistory = $("btnCloseHistory");
  const btnResetAllMastery = $("btnResetAllMastery");

  const btnGoChat = $("btnGoChat");
  const chatView = $("chatView");
  const labView = $("labView");
  const btnExitLab = $("btnExitLab");

  const modeLabel = $("modeLabel");
  const btnModeDemo = $("btnModeDemo");
  const btnModeLive = $("btnModeLive");
  const liveKeyBlock = $("liveKeyBlock");
  const inpKey = $("inpKey");
  const btnTestSave = $("btnTestSave");
  const btnClearKey = $("btnClearKey");
  const pillKeyOk = $("pillKeyOk");
  const demoBlock = $("demoBlock");
  const btnRestartDemo = $("btnRestartDemo");

  const languageGrid = $("languageGrid");
  const rngSpeed = $("rngSpeed");
  const speedVal = $("speedVal");
  const levelRow = $("levelRow");

  const errorBox = $("errorBox");
  const errorText = $("errorText");

  const chatScroll = $("chatScroll");
  const chatFooter = $("chatFooter");

  const labEmpty = $("labEmpty");
  const labBody = $("labBody");

  // ------------------------- State -------------------------
  const state = {
    mode: (localStorage.getItem(K.mode) === "live") ? "live" : "demo",
    apiKey: (localStorage.getItem(K.apiKey) || "").trim(),
    keyValid: !!localStorage.getItem(K.apiKeyValid) && !!(localStorage.getItem(K.apiKey) || "").trim(),
    seenIntro: !!localStorage.getItem(K.seenIntro),
    selectedLanguage: LANGUAGES[0],
    selectedLevel: LEVELS[0],
    playbackSpeed: 1.0,
    selectedVoiceName: localStorage.getItem("lingo_selected_voice") || "",
    messages: safeJson(localStorage.getItem(K.messages), []),
    difficult: safeJson(localStorage.getItem(K.difficult), []),
    activePracticeWord: null,
    demoTurnIndex: 0,
    demoDraft: DEMO_TURNS[0]?.user || "",
    isSessionActive: false,
    isHistoryOpen: false,
    drillTargetText: "",
  };

  // ------------------------- Helpers -------------------------
  function safeJson(str, fallback) {
    try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
  }

  function persist() {
    localStorage.setItem(K.mode, state.mode);
    localStorage.setItem(K.apiKey, state.apiKey || "");
    if (state.keyValid) localStorage.setItem(K.apiKeyValid, "1");
    else localStorage.removeItem(K.apiKeyValid);
    localStorage.setItem(K.messages, JSON.stringify(state.messages.slice(-60)));
    localStorage.setItem(K.difficult, JSON.stringify(state.difficult));
    localStorage.setItem("lingo_selected_voice", state.selectedVoiceName || "");
    if (state.keyValid && (state.apiKey || '').trim()) scheduleServerSync();
  }

// ------------------------- Backend Sync (optional) -------------------------
// Uses shared appdata persistence when this root exposes /api/appdata.
const APPDATA_APP = "lingolive-ai";

let _syncTimer = null;

function buildServerPayload() {
  return {
    kind: "lingolive_state_v1",
    ts: Date.now(),
    mode: state.mode,
    selectedLanguage: state.selectedLanguage?.code || "es",
    selectedLevel: state.selectedLevel,
    playbackSpeed: state.playbackSpeed,
    messages: state.messages.slice(-60),
    difficult: state.difficult,
  };
}

async function serverSaveNow() {
  const clientId = (state.apiKey || "").trim();
  if (!clientId) return;
  try {
    await window.NexusAppData?.save?.(APPDATA_APP, buildServerPayload(), { clientId });
  } catch (_) {
    // silent — local-first always works
  }
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

    if (Array.isArray(p.messages)) state.messages = p.messages;
    if (Array.isArray(p.difficult)) state.difficult = p.difficult;

    if (typeof p.playbackSpeed === "number") state.playbackSpeed = p.playbackSpeed;
    const lang = LANGUAGES.find(l => l.code === p.selectedLanguage);
    if (lang) state.selectedLanguage = lang;
    if (LEVELS.includes(p.selectedLevel)) state.selectedLevel = p.selectedLevel;

    persist();
    renderAll();
  } catch (_) {
    // silent
  }
}

  function setError(msg) {
    if (!msg) {
      errorBox.classList.add("hidden");
      introError.classList.add("hidden");
      introError.textContent = "";
      errorText.textContent = "";
      return;
    }
    errorText.textContent = msg;
    errorBox.classList.remove("hidden");
    introError.textContent = msg;
    introError.classList.remove("hidden");
  }

  function getScoreColor(score) {
    if (score >= 90) return "bg-emerald-950/50 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
    if (score >= 75) return "bg-amber-950/50 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]";
    return "bg-rose-950/50 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]";
  }

  class VisualizerManager {
    constructor() {
      this.audioCtx = null;
      this.analyser = null;
      this.dataArray = null;
      this.animationId = null;
      this.stream = null;
    }

    async start(stream) {
      this.stop();
      this.stream = stream;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        const source = this.audioCtx.createMediaStreamSource(stream);
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        this.draw();
      } catch (err) {
        log("Visualizer start error", err);
      }
    }

    stop() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      if (this.audioCtx) {
        if (this.audioCtx.state !== "closed") {
          this.audioCtx.close();
        }
        this.audioCtx = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      this.analyser = null;
      this.dataArray = null;
      
      const svg = document.getElementById("audioWaveform");
      if (svg) svg.innerHTML = "";
    }

    draw() {
      if (!this.analyser) return;
      this.animationId = requestAnimationFrame(() => this.draw());

      this.analyser.getByteTimeDomainData(this.dataArray);

      const svg = document.getElementById("audioWaveform");
      if (!svg) return;

      const width = svg.clientWidth || 400;
      const height = svg.clientHeight || 60;

      let pathData1 = "";
      let pathData2 = "";
      const len = this.dataArray.length;

      const points1 = [];
      const points2 = [];
      const sliceWidth = width / (len - 1);

      for (let i = 0; i < len; i++) {
        const v = this.dataArray[i] / 128.0; 
        const offset = (v - 1.0); 
        
        const x = i * sliceWidth;
        const distFromCenter = Math.abs(i - len / 2) / (len / 2);
        const windowFunc = Math.cos(distFromCenter * Math.PI / 2); 
        
        const y1 = height / 2 + offset * (height / 2.5) * windowFunc;
        const y2 = height / 2 + Math.sin(i * 0.15 + Date.now() * 0.015) * offset * (height / 3.5) * windowFunc;

        points1.push({ x, y: y1 });
        points2.push({ x, y: y2 });
      }

      pathData1 = this.getBezierPath(points1);
      pathData2 = this.getBezierPath(points2);

      svg.innerHTML = `
        <path d="${pathData1}" fill="none" stroke="url(#cyanGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.85" />
        <path d="${pathData2}" fill="none" stroke="url(#blueGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
        <defs>
          <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0" />
            <stop offset="50%" stop-color="#22d3ee" stop-opacity="1" />
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0" />
            <stop offset="50%" stop-color="#60a5fa" stop-opacity="1" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </linearGradient>
        </defs>
      `;
    }

    getBezierPath(points) {
      if (points.length < 2) return "";
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }
      return path;
    }
  }

  const visualizer = new VisualizerManager();

  function populateVoices() {
    const select = document.getElementById("selectTtsVoice");
    if (!select) return;
    select.innerHTML = "";
    if (!("speechSynthesis" in window)) {
      const opt = document.createElement("option");
      opt.textContent = "TTS Not Supported";
      select.appendChild(opt);
      return;
    }
    const voices = window.speechSynthesis.getVoices() || [];
    const langCode = state.selectedLanguage.code.toLowerCase();
    const filtered = voices.filter(v => (v.lang || "").toLowerCase().startsWith(langCode));

    if (filtered.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "System Default";
      opt.value = "";
      select.appendChild(opt);
      for (const v of voices.slice(0, 15)) {
        const o = document.createElement("option");
        o.textContent = `${v.name} (${v.lang})`;
        o.value = v.name;
        select.appendChild(o);
      }
    } else {
      for (const v of filtered) {
        const opt = document.createElement("option");
        opt.textContent = `${v.name} (${v.lang})`;
        opt.value = v.name;
        select.appendChild(opt);
      }
    }

    if (state.selectedVoiceName) {
      select.value = state.selectedVoiceName;
    }
  }

  function uid(prefix = "id") {
    return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  function ensureIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function openHistory() {
    state.isHistoryOpen = true;
    historyOverlay.classList.remove("hidden");
    labSidebar.classList.remove("-translate-x-full");
    labSidebar.classList.add("translate-x-0");
  }

  function closeHistory() {
    state.isHistoryOpen = false;
    historyOverlay.classList.add("hidden");
    labSidebar.classList.add("-translate-x-full");
    labSidebar.classList.remove("translate-x-0");
  }

  function setView(view) {
    if (view === "chat") {
      chatView.classList.remove("hidden");
      labView.classList.add("hidden");
    } else {
      chatView.classList.add("hidden");
      labView.classList.remove("hidden");
    }
    ensureIcons();
  }

  // ------------------------- Render -------------------------
  function renderLanguageGrid() {
    languageGrid.innerHTML = "";
    for (const lang of LANGUAGES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${state.selectedLanguage.code === lang.code ? "border-cyan-500 bg-cyan-950/30 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"}`;
      btn.innerHTML = `<span>${lang.flag}</span>${escapeHtml(lang.name)}`;
      btn.addEventListener("click", () => { state.selectedLanguage = lang; persist(); populateVoices(); renderAll(); });
      languageGrid.appendChild(btn);
    }
  }

  function renderLevelRow() {
    levelRow.innerHTML = "";
    for (const lvl of LEVELS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `flex-1 px-2 py-2 rounded-xl border text-[10px] font-bold transition-all ${state.selectedLevel === lvl ? "border-cyan-500 bg-cyan-950/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]" : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"}`;
      btn.textContent = lvl;
      btn.addEventListener("click", () => { state.selectedLevel = lvl; persist(); renderAll(); });
      levelRow.appendChild(btn);
    }
  }

  function renderModePanel() {
    const isDemo = state.mode === "demo";
    modeLabel.textContent = isDemo ? "Demo (no key)" : "Live (BYO key)";
    btnModeDemo.className = `px-3 py-2 rounded-xl border text-xs font-black ${isDemo ? "bg-slate-900 text-white border-slate-800" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"}`;
    btnModeLive.className = `px-3 py-2 rounded-xl border text-xs font-black ${!isDemo ? "bg-cyan-600 text-slate-950 border-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"}`;

    liveKeyBlock.classList.toggle("hidden", isDemo);
    demoBlock.classList.toggle("hidden", !isDemo);

    inpKey.value = state.apiKey;
    pillKeyOk.classList.toggle("hidden", !state.keyValid);
  }

  function renderChat() {
    chatScroll.innerHTML = "";

    const empty = state.messages.length === 0;
    if (empty) {
      chatScroll.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 p-8">
          <div class="p-6 bg-slate-900/60 border border-slate-800/80 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.1)]"><i data-lucide="message-circle" class="w-[64px] h-[64px] text-cyan-400"></i></div>
          <p class="font-bold text-lg text-slate-200">Ready for your neural language partner?</p>
          <p class="text-sm text-slate-500">Click start to begin an immersive voice-assisted session.</p>
        </div>
      `;
    } else {
      for (const msg of state.messages) {
        const wrap = document.createElement("div");
        wrap.className = `flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`;
        const bubble = document.createElement("div");
        bubble.className = `max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/20" : "bg-slate-900 border border-slate-800 text-slate-200"}`;
        bubble.innerHTML = `<p class="text-sm font-medium leading-relaxed">${escapeHtml(msg.text)}</p>`;
        wrap.appendChild(bubble);

        if (msg.role === "user" && msg.feedback) {
          const fb = msg.feedback;
          const fbWrap = document.createElement("div");
          fbWrap.className = "mt-3 w-[80%] bg-slate-950 border border-slate-850 rounded-2xl p-4 shadow-sm";
          fbWrap.innerHTML = `
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 font-black text-[10px] text-cyan-400 uppercase tracking-tighter">
                <i data-lucide="lightbulb" class="w-[16px] h-[16px]"></i> Analysis
              </div>
              <div class="px-3 py-1 rounded-full border font-black text-xs ${getScoreColor(fb.score)}">${fb.score}%</div>
            </div>
            <p class="text-xs text-slate-400 italic mb-2">&quot;${escapeHtml(fb.improvement)}&quot;</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-900">
              <p class="text-sm font-bold text-emerald-400">${escapeHtml(fb.correction)}</p>
              <button class="btnAddPractice p-2 bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-950/80 transition-colors" title="Add to Mastery Lab">
                <i data-lucide="plus" class="w-[16px] h-[16px]"></i>
              </button>
            </div>
          `;
          fbWrap.querySelector(".btnAddPractice").addEventListener("click", () => addToPractice(msg));
          wrap.appendChild(fbWrap);
        }

        chatScroll.appendChild(wrap);
      }
    }

    chatFooter.innerHTML = "";
    if (state.mode === "demo") {
      const box = document.createElement("div");
      box.className = "w-full max-w-2xl";
      box.innerHTML = `
        <div class="flex flex-col md:flex-row gap-3">
          <input id="demoDraft" value="${escapeAttr(state.demoDraft)}" placeholder="Demo input (edit me if you want)"
            class="flex-1 px-4 py-4 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 font-semibold focus:outline-none focus:border-cyan-500/60" />
          <button id="btnRunDemo" class="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-950/50 hover:from-cyan-500 hover:to-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2">
            <i data-lucide="sparkles" class="w-[18px] h-[18px]"></i> Run Demo Turn
          </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button id="btnRestart" class="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 font-black text-xs hover:bg-slate-850 flex items-center gap-2 transition-all">
            <i data-lucide="rotate-ccw" class="w-[14px] h-[14px]"></i> Restart
          </button>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Demo Mode — no mic, no key, no surprises</p>
        </div>
      `;
      chatFooter.appendChild(box);
      const demoDraft = box.querySelector("#demoDraft");
      demoDraft.addEventListener("input", () => { state.demoDraft = demoDraft.value; persist(); });
      box.querySelector("#btnRunDemo").addEventListener("click", runDemoTurn);
      box.querySelector("#btnRestart").addEventListener("click", () => { state.messages = []; state.demoTurnIndex = 0; state.demoDraft = DEMO_TURNS[0]?.user || ""; setError(null); persist(); renderAll(); });
    } else {
      const wrap = document.createElement("div");
      wrap.className = "flex flex-col items-center gap-4 w-full";
      
      const waveformSvgHtml = state.isSessionActive 
        ? `<svg id="audioWaveform" class="w-full max-w-lg h-16 transition-all duration-300" viewBox="0 0 400 60"></svg>`
        : ``;
        
      wrap.innerHTML = `
        ${waveformSvgHtml}
        <button id="btnStartStop" class="group relative px-12 py-5 rounded-3xl flex items-center gap-4 text-xl font-black shadow-2xl transition-all active:scale-95 ${state.isSessionActive ? "bg-rose-600 text-white shadow-rose-950/40" : "bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black shadow-cyan-950/25"}">
          ${state.isSessionActive ? "<i data-lucide=\"square\" class=\"w-[24px] h-[24px]\"></i> Stop" : "<i data-lucide=\"mic\" class=\"w-[24px] h-[24px]\"></i> Start Chat"}
        </button>
        <p class="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-[0.2em]">Live Mode — realtime mic + audio</p>
        <p class="text-xs text-slate-500 max-w-2xl text-center">
          Tip: If your browser doesn't support mic transcription, you can still practice in Demo Mode.
        </p>
      `;
      chatFooter.appendChild(wrap);
      wrap.querySelector("#btnStartStop").addEventListener("click", () => {
        if (!state.keyValid) { setError("Add and validate your key (Configuration → Live) or switch back to Demo."); return; }
        if (state.isSessionActive) stopSession(); else startSession();
      });
    }

    // Keep scrolled near bottom
    chatScroll.scrollTop = chatScroll.scrollHeight;
    ensureIcons();
  }

  function renderLabSidebar() {
    const count = state.difficult.length;
    if (count > 0) {
      labCount.textContent = String(count);
      labCount.classList.remove("hidden");
    } else {
      labCount.classList.add("hidden");
    }

    if (count === 0) {
      labList.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-slate-500 opacity-60 text-center px-6">
          <i data-lucide="star" class="w-[40px] h-[40px] mb-4 text-cyan-400 animate-pulse"></i>
          <p class="text-sm italic">Master difficult words here.</p>
        </div>
      `;
      ensureIcons();
      return;
    }

    labList.innerHTML = "";
    for (const w of state.difficult) {
      const container = document.createElement("div");
      container.className = "perspective-1000 w-full h-[220px] my-4";

      const inner = document.createElement("div");
      inner.className = "flip-card-inner relative w-full h-full transition-transform duration-500 transform-style-3d";

      // FRONT SIDE
      const front = document.createElement("div");
      front.className = "flip-card-front absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-cyan-500/40 transition-colors";
      
      const stageClass = w.currentStage === "word" ? "bg-slate-850 text-slate-400 border border-slate-800" : (w.currentStage === "sentence" ? "bg-amber-950/50 text-amber-400 border border-amber-500/20" : "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20");
      
      front.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase text-cyan-400 tracking-wider bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">${escapeHtml(w.language)}</span>
          <div class="text-[10px] font-black px-2 py-0.5 rounded ${stageClass}">${escapeHtml(w.currentStage.toUpperCase())}</div>
        </div>

        <div class="my-2">
          <p class="text-xl font-bold text-slate-100 tracking-tight leading-tight line-clamp-2">${escapeHtml(w.text)}</p>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Mastery</span>
            <span class="text-cyan-400">${Number(w.mastery || 0)}%</span>
          </div>
          <div class="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out shadow-sm" style="width:${Math.max(0, Math.min(100, Number(w.mastery || 0)))}%"></div>
          </div>
        </div>

        <div class="flex items-center justify-between text-slate-500 text-[11px] mt-2 pt-2 border-t border-slate-800/60">
          <span class="flex items-center gap-1"><i data-lucide="help-circle" class="w-3.5 h-3.5 text-cyan-500"></i> Click to Flip</span>
          <button class="btnDelOne p-1 text-slate-500 hover:text-rose-400 transition-colors" title="Delete word"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      `;

      // BACK SIDE
      const back = document.createElement("div");
      back.className = "flip-card-back absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-cyan-500/30 bg-slate-950 p-5 flex flex-col justify-between shadow-[0_4px_15px_rgba(6,182,212,0.15)] transform rotate-y-180";
      
      const sc = w.feedback?.score || 0;
      back.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feedback</span>
          <div class="px-2.5 py-0.5 rounded-full border font-black text-xs ${getScoreColor(sc)}">${sc}%</div>
        </div>

        <div class="flex-1 my-3 overflow-y-auto custom-scrollbar pr-1">
          <p class="text-xs text-slate-355 italic mb-2 leading-relaxed">&quot;${escapeHtml(w.feedback?.improvement || "No improvement notes yet.")}&quot;</p>
          <p class="text-xs font-bold text-emerald-400 leading-normal">${escapeHtml(w.feedback?.correction || "")}</p>
        </div>

        <div class="flex gap-2 border-t border-slate-900 pt-3">
          <button class="btnListen flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-slate-800">
            <i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Speak
          </button>
          <button class="btnResume flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 active:scale-95">
            <i data-lucide="target" class="w-3.5 h-3.5"></i> Train
          </button>
        </div>
      `;

      // Event Listeners
      inner.addEventListener("click", () => {
        inner.classList.toggle("flipped");
      });

      front.querySelector(".btnDelOne").addEventListener("click", (e) => {
        e.stopPropagation();
        removeDifficultWord(w.id);
      });

      back.querySelector(".btnListen").addEventListener("click", (e) => {
        e.stopPropagation();
        speakText(w.text);
      });

      back.querySelector(".btnResume").addEventListener("click", (e) => {
        e.stopPropagation();
        state.activePracticeWord = w;
        setView("lab");
        closeHistory();
        renderLab();
      });

      inner.appendChild(front);
      inner.appendChild(back);
      container.appendChild(inner);
      labList.appendChild(container);
    }
    ensureIcons();
  }

  function renderLab() {
    if (!state.activePracticeWord) {
      labEmpty.classList.remove("hidden");
      labBody.classList.add("hidden");
      return;
    }
    labEmpty.classList.add("hidden");
    labBody.classList.remove("hidden");

    const w = state.activePracticeWord;
    const stage = w.currentStage;
    const stageNum = stage === "word" ? 1 : (stage === "sentence" ? 2 : 3);
    const goalText = stage === "word"
      ? `Perfect the isolation of the word “${w.text}”. Aim for a score of 90.`
      : (stage === "sentence" ? "Great word mastery! Now, let's use it in a natural sentence to improve your flow." : "The final test! Coach Lingo has a tongue-twister prepared to solidify your neural pathways.");

    const recentAttempts = state.messages.filter(m => m.feedback).slice(-12).reverse();

    labBody.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-5xl font-black text-slate-100 tracking-tight mb-2">${escapeHtml(w.text)}</h2>
          <div class="flex gap-4">
            <div class="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 text-emerald-400 rounded-full text-xs font-black border border-emerald-500/20 shadow-sm">
              <i data-lucide="check-circle-2" class="w-[14px] h-[14px]"></i> ${stage.toUpperCase()} DRILL
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 text-cyan-400 rounded-full text-xs font-black border border-cyan-500/20 shadow-sm">
              <i data-lucide="star" class="w-[14px] h-[14px]"></i> ${Number(w.mastery || 0)}% MASTERY
            </div>
          </div>
        </div>
        <button id="btnRefAudio" class="w-20 h-20 bg-slate-900 border border-slate-800 text-cyan-400 rounded-full flex items-center justify-center hover:bg-slate-850 hover:text-cyan-300 transition-all shadow-inner">
          <i data-lucide="volume-2" class="w-[32px] h-[32px]"></i>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-4">
        ${["word","sentence","challenge"].map((s, idx) => `
          <div class="p-4 rounded-2xl border transition-all flex flex-col items-center text-center ${stage === s ? "border-cyan-500 bg-cyan-950/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-105" : "border-slate-800 opacity-40 text-slate-400"}">
            <div class="w-10 h-10 rounded-full mb-3 flex items-center justify-center font-black ${stage === s ? "bg-cyan-600 text-slate-950 shadow-cyan-500/10" : "bg-slate-800 text-slate-400"}">${idx+1}</div>
            <span class="text-[10px] font-black uppercase tracking-widest">${s}</span>
          </div>
        `).join("")}
      </div>

      <div class="flex-1 bg-slate-950/40 border-2 border-dashed border-slate-800 rounded-[40px] flex flex-col items-center justify-center p-12 text-center transition-all">
        ${state.isSessionActive ? `
          <div class="animate-in zoom-in duration-500 flex flex-col items-center max-w-2xl w-full">
            <div class="w-24 h-24 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full flex items-center justify-center pulse-animation shadow-2xl mb-6">
              <i data-lucide="mic" class="w-[40px] h-[40px]"></i>
            </div>
            <svg id="audioWaveform" class="w-full max-w-lg h-16 transition-all duration-300 mb-4" viewBox="0 0 400 60"></svg>
            <h3 class="text-xl font-black text-slate-200 mb-2 uppercase tracking-tight">Your Turn</h3>
            <p class="text-2xl font-black text-cyan-400 italic">&quot;${escapeHtml(stage === "word" ? w.text : (state.drillTargetText || w.text))}&quot;</p>
            <p class="text-slate-500 font-bold text-xs uppercase mt-6 tracking-widest">Listening for pronunciation...</p>
          </div>
        ` : `
          <div class="max-w-md">
            <h3 class="text-2xl font-black text-slate-200 mb-4">Stage ${stageNum} Goal</h3>
            <p class="text-slate-400 font-medium mb-10 leading-relaxed">${escapeHtml(goalText)}</p>
            <button id="btnBeginStage" class="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 rounded-3xl text-xl font-black shadow-2xl transition-all hover:scale-105 active:scale-95 shadow-cyan-950/30">
              Begin Stage Drill
            </button>
          </div>
        `}
      </div>

      ${recentAttempts.length ? `
        <div class="max-h-[300px] overflow-y-auto space-y-4 pr-4 custom-scrollbar">
          <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-[#030712] sticky top-0 py-2">Attempt Log</h4>
          ${recentAttempts.map(m => {
            const sc = m.feedback.score;
            const trophy = sc >= 90 ? `<i data-lucide="trophy" class="w-[24px] h-[24px] text-yellow-500 shrink-0"></i>` : ``;
            return `
              <div class="p-4 bg-slate-900/60 border border-slate-850 rounded-2xl shadow-sm flex items-center gap-6 group hover:border-cyan-500/30 transition-all">
                <div class="w-12 h-12 shrink-0 flex items-center justify-center rounded-full border-2 font-black text-sm ${getScoreColor(sc)} shadow-inner bg-slate-950">${sc}</div>
                <div class="flex-1">
                  <p class="text-base font-bold text-slate-200 italic group-hover:text-cyan-400 transition-colors">&quot;${escapeHtml(m.text)}&quot;</p>
                  <p class="text-xs text-slate-400 mt-1">${escapeHtml(m.feedback.improvement)}</p>
                </div>
                ${trophy}
              </div>
            `;
          }).join("")}
        </div>
      ` : ``}
    `;

    const btnRefAudio = labBody.querySelector("#btnRefAudio");
    btnRefAudio?.addEventListener("click", () => speakText(w.text));
    const btnBeginStage = labBody.querySelector("#btnBeginStage");
    btnBeginStage?.addEventListener("click", () => startSession("drill"));

    ensureIcons();
  }

  function renderAll() {
    speedVal.textContent = `${Number(state.playbackSpeed).toFixed(1)}x`;
    rngSpeed.value = String(state.playbackSpeed);
    renderModePanel();
    renderLanguageGrid();
    renderLevelRow();
    renderLabSidebar();
    renderChat();
    renderLab();
    persist();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/\n/g, " ");
  }

  // ------------------------- Core actions -------------------------
  function beginDemo() {
    state.mode = "demo";
    state.isSessionActive = false;
    setError(null);
    state.messages = [];
    state.demoTurnIndex = 0;
    state.demoDraft = DEMO_TURNS[0]?.user || "";
    persist();
    renderAll();
  }

  function runDemoTurn() {
    setError(null);
    const turn = DEMO_TURNS[state.demoTurnIndex];
    if (!turn) {
      setError("Demo complete. Add your key to go live, or restart the demo.");
      return;
    }
    const now = Date.now();
    const userText = (state.demoDraft || turn.user).trim();
    state.messages.push({ id: uid("demo-u"), role: "user", text: userText, timestamp: now, feedback: { ...turn.feedback, originalText: userText } });
    state.messages.push({ id: uid("demo-m"), role: "model", text: turn.model, timestamp: now + 1 });
    state.messages = state.messages.slice(-60);
    state.demoTurnIndex = Math.min(state.demoTurnIndex + 1, DEMO_TURNS.length);
    state.demoDraft = DEMO_TURNS[Math.min(state.demoTurnIndex, DEMO_TURNS.length - 1)]?.user || "";
    persist();
    renderAll();
  }

  function addToPractice(userMsg) {
    if (!userMsg?.feedback) return;
    const text = String(userMsg.feedback.originalText || userMsg.text || "").trim();
    if (!text) return;
    // Dedup by text+language
    const existing = state.difficult.find(d => d.text === text && d.language === state.selectedLanguage.name);
    if (existing) {
      // Small mastery bump for repeated adds
      existing.mastery = Math.min(100, Number(existing.mastery || 0) + 2);
      existing.timestamp = Date.now();
    } else {
      state.difficult.unshift({
        id: uid("dw"),
        text,
        feedback: userMsg.feedback,
        language: state.selectedLanguage.name,
        level: state.selectedLevel,
        timestamp: Date.now(),
        mastery: 0,
        currentStage: "word",
      });
    }
    persist();
    renderLabSidebar();
  }

  function resetAllMastery() {
    state.difficult = [];
    persist();
    renderAll();
  }

  function resetSingleMastery(id) {
    const w = state.difficult.find(d => d.id === id);
    if (!w) return;
    w.mastery = 0;
    w.currentStage = "word";
    persist();
    renderAll();
  }

  function removeDifficultWord(id) {
    state.difficult = state.difficult.filter(d => d.id !== id);
    if (state.activePracticeWord?.id === id) state.activePracticeWord = null;
    persist();
    renderAll();
  }

  // ------------------------- Live mode (client-side, key required) -------------------------
  async function testKey(key) {
    const k = (key || "").trim();
    if (!k) throw new Error("Paste your API key first.");

    // NOTE: Some browsers/environments may block direct calls to Google APIs via CORS.
    // If that happens, we fail cleanly and advise Demo Mode.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(k)}`;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      });
    } catch (e) {
      // Typical browser message: TypeError: Failed to fetch
      throw new Error("Live Mode request was blocked by the browser (network/CORS). Use Demo Mode, or add a same-origin proxy endpoint later.");
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Key test failed (${res.status}). ${t.slice(0, 200)}`);
    }
    return true;
  }


  async function getPronunciationFeedback(text) {
    const k = state.apiKey.trim();
    if (!k) throw new Error("Missing API key.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(k)}`;
    const prompt = `You are a pronunciation coach. Language: ${state.selectedLanguage.name}. Level: ${state.selectedLevel}.

User attempted to say: "${text}"

Return ONLY valid JSON with keys: improvement (string), correction (string), score (number 0-100). Keep it short and specific.`;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 180 },
        }),
      });
    } catch (e) {
      throw new Error("Live Mode request was blocked by the browser (network/CORS). Use Demo Mode, or add a same-origin proxy endpoint later.");
    }

    if (!res.ok) {
      // Keep details minimal in UI; the user can view raw logs in console.
      throw new Error(`Gemini error (${res.status}).`);
    }
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    const json = safeExtractJson(out);
    if (!json) throw new Error("Could not parse feedback.");
    return {
      originalText: text,
      improvement: String(json.improvement || ""),
      correction: String(json.correction || ""),
      score: clampScore(json.score),
    };
  }


  function safeExtractJson(text) {
    try {
      const trimmed = String(text).trim();
      if (trimmed.startsWith("{")) return JSON.parse(trimmed);
      const m = trimmed.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch { return null; }
  }

  function clampScore(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 70;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function speakText(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(String(text));
      u.rate = state.playbackSpeed;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const selectedName = document.getElementById("selectTtsVoice")?.value || state.selectedVoiceName;
      let v = voices.find(vv => vv.name === selectedName);
      if (!v) {
        const langCode = state.selectedLanguage.code.toLowerCase();
        v = voices.find(vv => (vv.lang || "").toLowerCase().startsWith(langCode)) || voices[0];
      }
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { log("TTS error", e); }
  }

  let rec = null;
  function startSession(kind = "chat") {
    setError(null);
    if (state.mode !== "live") return;
    if (!state.keyValid) { setError("Add and validate your key first."); return; }
    state.isSessionActive = true;
    renderChat();
    renderLab();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("This browser doesn't support Speech Recognition. Switch to Demo Mode for instant practice.");
      state.isSessionActive = false;
      renderAll();
      return;
    }

    // Start Web Audio voice visualizer stream
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        visualizer.start(stream);
      })
      .catch(err => {
        log("Mic capture for visualizer failed", err);
      });

    rec = new SR();
    rec.lang = state.selectedLanguage.code === "en" ? "en-US" : (state.selectedLanguage.code);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = async (evt) => {
      const said = evt?.results?.[0]?.[0]?.transcript || "";
      const text = String(said).trim();
      if (!text) return;
      await handleLiveUtterance(text, kind);
    };
    rec.onerror = (e) => {
      log("SR error", e);
      setError("Mic error. You may need to allow microphone permission.");
      stopSession();
    };
    rec.onend = () => {
      stopSession();
    };
    try {
      rec.start();
    } catch (e) {
      log("SR start failed", e);
      setError("Couldn't start mic. Check permissions.");
      stopSession();
    }
  }

  async function handleLiveUtterance(text, kind) {
    const now = Date.now();
    state.messages.push({ id: uid("u"), role: "user", text, timestamp: now });
    renderChat();
    try {
      const fb = await getPronunciationFeedback(text);
      // attach feedback to that user message
      const lastUser = [...state.messages].reverse().find(m => m.role === "user" && !m.feedback);
      if (lastUser) lastUser.feedback = fb;
      state.messages.push({ id: uid("m"), role: "model", text: "Nice — review the analysis and add it to your Mastery Lab if it's tricky.", timestamp: now + 1 });
      // mastery progression when drilling
      if (kind === "drill" && state.activePracticeWord) {
        const sc = fb.score;
        const w = state.activePracticeWord;
        if (sc >= 90) {
          w.mastery = Math.min(100, Number(w.mastery || 0) + 10);
          if (w.currentStage === "word") w.currentStage = "sentence";
          else if (w.currentStage === "sentence") w.currentStage = "challenge";
          else w.currentStage = "challenge";
        } else {
          w.mastery = Math.min(100, Number(w.mastery || 0) + 2);
        }
      }
      persist();
      renderAll();
      // speak correction lightly
      speakText(fb.correction);
    } catch (e) {
      setError(e?.message || "Live feedback failed.");
      persist();
      renderAll();
    }
  }

  function stopSession() {
    state.isSessionActive = false;
    try { rec?.stop?.(); } catch {}
    rec = null;
    visualizer.stop();
    renderAll();
  }

  // ------------------------- Wiring -------------------------
  function wire() {
    // Intro gate
    if (!state.seenIntro) {
      introGate.classList.remove("hidden");
      introGate.classList.add("flex");
    }

    $("btnIntroClose").addEventListener("click", () => {
      localStorage.setItem(K.seenIntro, "1");
      state.seenIntro = true;
      introGate.classList.add("hidden");
      introGate.classList.remove("flex");
    });
    $("btnIntroTryDemo").addEventListener("click", () => {
      localStorage.setItem(K.seenIntro, "1");
      state.seenIntro = true;
      introGate.classList.add("hidden");
      introGate.classList.remove("flex");
      beginDemo();
    });
    $("btnIntroUseKey").addEventListener("click", () => {
      state.mode = "live";
      introLivePanel.classList.remove("hidden");
      inpIntroKey.value = state.apiKey;
      renderAll();
    });
    $("btnIntroUseDemoInstead").addEventListener("click", () => {
      localStorage.setItem(K.seenIntro, "1");
      state.seenIntro = true;
      introGate.classList.add("hidden");
      introGate.classList.remove("flex");
      beginDemo();
    });
    $("btnIntroTestSave").addEventListener("click", async () => {
      setError(null);
      const k = inpIntroKey.value.trim();
      try {
        btnIntroContinue.disabled = true;
        await testKey(k);
        state.apiKey = k;
        state.keyValid = true;
        persist();
        btnIntroContinue.disabled = false;
        renderAll();
      } catch (e) {
        state.keyValid = false;
        persist();
        btnIntroContinue.disabled = true;
        setError(e?.message || "Key test failed.");
      }
    });
    btnIntroContinue.addEventListener("click", () => {
      if (!state.keyValid) return;
      localStorage.setItem(K.seenIntro, "1");
      state.seenIntro = true;
      introGate.classList.add("hidden");
      introGate.classList.remove("flex");
      renderAll();
    });

    // History
    btnOpenHistory.addEventListener("click", openHistory);
    btnCloseHistory.addEventListener("click", closeHistory);
    historyOverlay.addEventListener("click", closeHistory);
    btnResetAllMastery.addEventListener("click", resetAllMastery);

    // View
    btnGoChat.addEventListener("click", () => setView("chat"));
    btnExitLab.addEventListener("click", () => setView("chat"));

    // Mode panel
    btnModeDemo.addEventListener("click", () => { state.mode = "demo"; beginDemo(); });
    btnModeLive.addEventListener("click", () => { state.mode = "live"; persist(); renderAll(); });

    inpKey.addEventListener("input", () => { state.apiKey = inpKey.value; state.keyValid = !!localStorage.getItem(K.apiKeyValid) && state.apiKey.trim().length > 0; persist(); renderAll(); });
    btnClearKey.addEventListener("click", () => { state.apiKey = ""; state.keyValid = false; persist(); renderAll(); });
    btnTestSave.addEventListener("click", async () => {
      setError(null);
      const k = inpKey.value.trim();
      btnTestSave.disabled = true;
      try {
        await testKey(k);
        state.apiKey = k;
        state.keyValid = true;
        persist();
        renderAll();
        serverLoadLatest();
      } catch (e) {
        state.keyValid = false;
        persist();
        setError(e?.message || "Key test failed.");
        renderAll();
      } finally {
        btnTestSave.disabled = false;
      }
    });

    btnRestartDemo.addEventListener("click", () => beginDemo());

    rngSpeed.addEventListener("input", () => {
      state.playbackSpeed = Number(rngSpeed.value);
      persist();
      renderAll();
    });

    const selectTts = document.getElementById("selectTtsVoice");
    if (selectTts) {
      selectTts.addEventListener("change", () => {
        state.selectedVoiceName = selectTts.value;
        persist();
      });
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        populateVoices();
      };
    }
    populateVoices();

    ensureIcons();
  }

  // Boot
  wire();
  // If there was no prior selection, keep defaults
  renderAll();
  ensureIcons();

  if (state.keyValid && (state.apiKey || '').trim()) serverLoadLatest();

})();
