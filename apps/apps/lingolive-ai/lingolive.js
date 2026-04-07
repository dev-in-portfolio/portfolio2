(() => {
  "use strict";

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
    if (state.keyValid && (state.apiKey || '').trim()) scheduleServerSync();
  }

// ------------------------- Backend Sync (optional) -------------------------
// Uses Netlify Functions via /api/* redirect. Silent fallback if offline/unconfigured.
const SERVER = {
  saveUrl: "/api/lingolive-save",
};

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
    await fetch(SERVER.saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, payload: buildServerPayload() }),
    });
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
    const res = await fetch(`${SERVER.saveUrl}?client_id=${encodeURIComponent(clientId)}&limit=1`, { method: "GET" });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const p = data?.items?.[0]?.payload;
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
    if (score >= 90) return "bg-green-50 border-green-200 text-green-700";
    if (score >= 75) return "bg-amber-50 border-amber-200 text-amber-700";
    return "bg-red-50 border-red-200 text-red-700";
  }

  function uid(prefix = "id") {
    return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  function ensureIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function extractSuggestedPhrase(correctionText, fallbackText) {
    const text = String(correctionText || "").trim();
    const quoted = text.match(/[“"](.*?)[”"]/);
    if (quoted && quoted[1]) return quoted[1].trim();
    const tryMatch = text.match(/try:\s*(.+)$/i);
    if (tryMatch && tryMatch[1]) return tryMatch[1].trim();
    const cleaned = text.replace(/^(tip|note|correction)\s*:\s*/i, "").trim();
    if (!cleaned) return String(fallbackText || "").trim();
    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    return wordCount <= 1 ? String(fallbackText || "").trim() : cleaned;
  }

  function splitTokens(text) {
    return String(text || "").match(/\w+|[^\w\s]+|\s+/g) || [];
  }

  function normalizeToken(token) {
    return String(token || "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  }

  function buildCorrectionMarkup(originalText, suggestedText) {
    const originalTokens = splitTokens(originalText);
    const suggestedTokens = splitTokens(suggestedText);
    const normalizedSuggested = suggestedTokens
      .filter((token) => !/^\s+$/.test(token))
      .map(normalizeToken)
      .filter(Boolean);
    const remaining = normalizedSuggested.slice();

    const originalHtml = originalTokens.map((token) => {
      if (/^\s+$/.test(token)) return escapeHtml(token);
      const normalized = normalizeToken(token);
      if (!normalized) return escapeHtml(token);
      const matchIndex = remaining.indexOf(normalized);
      if (matchIndex >= 0) {
        remaining.splice(matchIndex, 1);
        return `<span>${escapeHtml(token)}</span>`;
      }
      return `<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded-md">${escapeHtml(token)}</mark>`;
    }).join("");

    const normalizedOriginal = originalTokens
      .filter((token) => !/^\s+$/.test(token))
      .map(normalizeToken)
      .filter(Boolean);
    const remainingOriginal = normalizedOriginal.slice();
    const suggestedHtml = suggestedTokens.map((token) => {
      if (/^\s+$/.test(token)) return escapeHtml(token);
      const normalized = normalizeToken(token);
      if (!normalized) return escapeHtml(token);
      const matchIndex = remainingOriginal.indexOf(normalized);
      if (matchIndex >= 0) {
        remainingOriginal.splice(matchIndex, 1);
        return `<span>${escapeHtml(token)}</span>`;
      }
      return `<mark class="bg-green-100 text-green-900 px-1 py-0.5 rounded-md">${escapeHtml(token)}</mark>`;
    }).join("");

    return { originalHtml, suggestedHtml };
  }

  function buildTranscriptReviewEntries() {
    return state.messages
      .filter((msg) => msg.role === "user" && msg.feedback)
      .map((msg) => {
        const feedback = msg.feedback || {};
        const originalText = String(feedback.originalText || msg.text || "").trim();
        const suggestedText = extractSuggestedPhrase(feedback.correction, originalText);
        return {
          id: msg.id,
          msg,
          score: clampScore(feedback.score),
          improvement: String(feedback.improvement || "").trim(),
          correction: String(feedback.correction || "").trim(),
          originalText,
          suggestedText,
          ...buildCorrectionMarkup(originalText, suggestedText),
        };
      });
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
      btn.className = `flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${state.selectedLanguage.code === lang.code ? "border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`;
      btn.innerHTML = `<span>${lang.flag}</span>${escapeHtml(lang.name)}`;
      btn.addEventListener("click", () => { state.selectedLanguage = lang; persist(); renderAll(); });
      languageGrid.appendChild(btn);
    }
  }

  function renderLevelRow() {
    levelRow.innerHTML = "";
    for (const lvl of LEVELS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `flex-1 px-2 py-2 rounded-xl border text-[10px] font-bold transition-all ${state.selectedLevel === lvl ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 hover:border-slate-300"}`;
      btn.textContent = lvl;
      btn.addEventListener("click", () => { state.selectedLevel = lvl; persist(); renderAll(); });
      levelRow.appendChild(btn);
    }
  }

  function renderModePanel() {
    const isDemo = state.mode === "demo";
    modeLabel.textContent = isDemo ? "Demo (no key)" : "Live (BYO key)";
    btnModeDemo.className = `px-3 py-2 rounded-xl border text-xs font-black ${isDemo ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`;
    btnModeLive.className = `px-3 py-2 rounded-xl border text-xs font-black ${!isDemo ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`;

    liveKeyBlock.classList.toggle("hidden", isDemo);
    demoBlock.classList.toggle("hidden", !isDemo);

    inpKey.value = state.apiKey;
    pillKeyOk.classList.toggle("hidden", !state.keyValid);
  }

  function renderChat() {
    chatScroll.innerHTML = "";
    const transcriptReview = buildTranscriptReviewEntries();

    const empty = state.messages.length === 0;
    if (empty) {
      chatScroll.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
          <div class="p-6 bg-slate-50 rounded-full"><i data-lucide="message-circle" class="w-[64px] h-[64px]"></i></div>
          <p class="font-bold text-lg">Ready for your native partner?</p>
          <p class="text-sm text-slate-400">Click start to begin a real-time conversation.</p>
        </div>
      `;
    } else {
      for (const msg of state.messages) {
        const wrap = document.createElement("div");
        wrap.className = `flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`;
        const bubble = document.createElement("div");
        bubble.className = `max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 text-slate-800 border border-slate-200"}`;
        bubble.innerHTML = `<p class="text-sm font-medium leading-relaxed">${escapeHtml(msg.text)}</p>`;
        wrap.appendChild(bubble);

        if (msg.role === "user" && msg.feedback) {
          const fb = msg.feedback;
          const fbWrap = document.createElement("div");
          fbWrap.className = "mt-3 w-[80%] bg-white border-2 border-amber-100 rounded-2xl p-4 shadow-sm";
          fbWrap.innerHTML = `
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 font-black text-[10px] text-amber-600 uppercase tracking-tighter">
                <i data-lucide="lightbulb" class="w-[16px] h-[16px]"></i> Analysis
              </div>
              <div class="px-3 py-1 rounded-full border-2 font-black text-xs ${getScoreColor(fb.score)}">${fb.score}%</div>
            </div>
            <p class="text-xs text-slate-600 italic mb-2">&quot;${escapeHtml(fb.improvement)}&quot;</p>
            <div class="flex items-center justify-between pt-2 border-t border-slate-50">
              <p class="text-sm font-bold text-green-700">${escapeHtml(fb.correction)}</p>
              <button class="btnAddPractice p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Add to Mastery Lab">
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

    if (transcriptReview.length) {
      const panel = document.createElement("section");
      panel.className = "mt-2 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden";
      panel.innerHTML = `
        <div class="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
              <i data-lucide="file-text" class="w-[16px] h-[16px]"></i>
              Transcript Review
            </div>
            <h3 class="mt-2 text-xl font-black text-slate-900 tracking-tight">See exactly what to keep and what to change</h3>
            <p class="mt-1 text-sm text-slate-500">Each line shows your original attempt, a corrected version, and the coaching signal behind it.</p>
          </div>
          <div class="shrink-0 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black">
            ${transcriptReview.length} reviewed lines
          </div>
        </div>
        <div id="transcriptReviewList" class="p-4 md:p-6 space-y-4"></div>
      `;
      const list = panel.querySelector("#transcriptReviewList");
      transcriptReview.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
        card.innerHTML = `
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <i data-lucide="message-square-quote" class="w-[15px] h-[15px]"></i>
              Practice line
            </div>
            <div class="px-3 py-1 rounded-full border-2 font-black text-xs ${getScoreColor(entry.score)}">${entry.score}%</div>
          </div>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div class="rounded-2xl bg-amber-50 border border-amber-100 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Original</div>
              <p class="mt-2 text-sm font-semibold text-slate-800 leading-7">${entry.originalHtml}</p>
            </div>
            <div class="rounded-2xl bg-green-50 border border-green-100 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-green-700">Coach version</div>
              <p class="mt-2 text-sm font-semibold text-slate-800 leading-7">${entry.suggestedHtml}</p>
            </div>
          </div>
          <div class="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coach note</div>
            <p class="mt-2 text-sm text-slate-700 font-medium">${escapeHtml(entry.improvement || "Keep the corrected rhythm and repeat it once at natural speed.")}</p>
            <p class="mt-3 text-sm font-bold text-green-700">${escapeHtml(entry.correction)}</p>
          </div>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-xs text-slate-500 font-semibold">Marked words show what changed between what you said and what you should repeat.</div>
            <button class="btnAddPracticeInline px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors flex items-center gap-2">
              <i data-lucide="plus" class="w-[14px] h-[14px]"></i>
              Add To Mastery Lab
            </button>
          </div>
        `;
        card.querySelector(".btnAddPracticeInline").addEventListener("click", () => addToPractice(entry.msg));
        list.appendChild(card);
      });
      chatScroll.appendChild(panel);
    }

    // Footer controls (demo vs live) match the original layout.
    chatFooter.innerHTML = "";
    if (state.mode === "demo") {
      const box = document.createElement("div");
      box.className = "w-full max-w-2xl";
      box.innerHTML = `
        <div class="flex flex-col md:flex-row gap-3">
          <input id="demoDraft" value="${escapeAttr(state.demoDraft)}" placeholder="Demo input (edit me if you want)"
            class="flex-1 px-4 py-4 rounded-2xl border border-slate-200 bg-white font-semibold" />
          <button id="btnRunDemo" class="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
            <i data-lucide="sparkles" class="w-[18px] h-[18px]"></i> Run Demo Turn
          </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button id="btnRestart" class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-50 flex items-center gap-2">
            <i data-lucide="rotate-ccw" class="w-[14px] h-[14px]"></i> Restart
          </button>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Demo Mode — no mic, no key, no surprises</p>
        </div>
      `;
      chatFooter.appendChild(box);
      const demoDraft = box.querySelector("#demoDraft");
      demoDraft.addEventListener("input", () => { state.demoDraft = demoDraft.value; persist(); });
      box.querySelector("#btnRunDemo").addEventListener("click", runDemoTurn);
      box.querySelector("#btnRestart").addEventListener("click", () => { state.messages = []; state.demoTurnIndex = 0; state.demoDraft = DEMO_TURNS[0]?.user || ""; setError(null); persist(); renderAll(); });
    } else {
      const wrap = document.createElement("div");
      wrap.className = "flex flex-col items-center gap-4";
      wrap.innerHTML = `
        <button id="btnStartStop" class="group relative px-12 py-5 rounded-3xl flex items-center gap-4 text-xl font-black shadow-2xl transition-all active:scale-95 ${state.isSessionActive ? "bg-red-600 text-white shadow-red-200" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"}">
          ${state.isSessionActive ? "<i data-lucide=\"square\" class=\"w-[24px] h-[24px]\"></i> Stop" : "<i data-lucide=\"mic\" class=\"w-[24px] h-[24px]\"></i> Start Chat"}
        </button>
        <p class="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Live Mode — realtime mic + audio</p>
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
        <div class="flex flex-col items-center justify-center py-16 text-slate-400 opacity-60 text-center px-6">
          <i data-lucide="star" class="w-[40px] h-[40px] mb-4 text-blue-200"></i>
          <p class="text-sm italic">Master difficult words here.</p>
        </div>
      `;
      ensureIcons();
      return;
    }

    labList.innerHTML = "";
    for (const w of state.difficult) {
      const card = document.createElement("div");
      card.className = "group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-lg transition-all";
      const stageClass = w.currentStage === "word" ? "bg-slate-100 text-slate-500" : (w.currentStage === "sentence" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600");
      card.innerHTML = `
        <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btnResetOne p-1.5 text-slate-300 hover:text-blue-500" title="Reset progress"><i data-lucide="rotate-ccw" class="w-[14px] h-[14px]"></i></button>
          <button class="btnDelOne p-1.5 text-slate-300 hover:text-red-500" title="Delete word"><i data-lucide="trash-2" class="w-[14px] h-[14px]"></i></button>
        </div>

        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black uppercase text-blue-600 tracking-wider bg-blue-50 px-2 py-1 rounded-md border border-blue-100">${escapeHtml(w.language)}</span>
          <div class="flex items-center gap-1">
            <div class="text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${stageClass}">${escapeHtml(w.currentStage)}</div>
          </div>
        </div>

        <p class="text-lg font-black text-slate-800 mb-4 tracking-tight leading-tight">${escapeHtml(w.text)}</p>

        <div class="space-y-1.5 mb-5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</span>
            <span class="text-xs font-black text-blue-600">${Number(w.mastery || 0)}%</span>
          </div>
          <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-sm" style="width:${Math.max(0, Math.min(100, Number(w.mastery || 0)))}%"></div>
          </div>
        </div>

        <button class="btnResume w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-blue-200 active:scale-95">
          <i data-lucide="target" class="w-[14px] h-[14px]"></i> Resume Training
        </button>
      `;
      card.querySelector(".btnResume").addEventListener("click", () => { state.activePracticeWord = w; setView("lab"); closeHistory(); renderLab(); });
      card.querySelector(".btnResetOne").addEventListener("click", () => resetSingleMastery(w.id));
      card.querySelector(".btnDelOne").addEventListener("click", () => removeDifficultWord(w.id));
      labList.appendChild(card);
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
          <h2 class="text-5xl font-black text-slate-900 tracking-tight mb-2">${escapeHtml(w.text)}</h2>
          <div class="flex gap-4">
            <div class="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black border border-green-100 shadow-sm">
              <i data-lucide="check-circle-2" class="w-[14px] h-[14px]"></i> ${stage.toUpperCase()} DRILL
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black border border-blue-100 shadow-sm">
              <i data-lucide="star" class="w-[14px] h-[14px]"></i> ${Number(w.mastery || 0)}% MASTERY
            </div>
          </div>
        </div>
        <button id="btnRefAudio" class="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-all shadow-inner border border-blue-100">
          <i data-lucide="volume-2" class="w-[32px] h-[32px]"></i>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-4">
        ${["word","sentence","challenge"].map((s, idx) => `
          <div class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center ${stage === s ? "border-blue-500 bg-blue-50 shadow-lg scale-105" : "border-slate-100 opacity-40"}">
            <div class="w-10 h-10 rounded-full mb-3 flex items-center justify-center font-black ${stage === s ? "bg-blue-600 text-white shadow-blue-200" : "bg-slate-200 text-slate-500"}">${idx+1}</div>
            <span class="text-[10px] font-black uppercase tracking-widest">${s}</span>
          </div>
        `).join("")}
      </div>

      <div class="flex-1 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center p-12 text-center transition-all">
        ${state.isSessionActive ? `
          <div class="animate-in zoom-in duration-500 flex flex-col items-center max-w-2xl w-full">
            <div class="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white pulse-animation shadow-2xl mb-6">
              <i data-lucide="mic" class="w-[40px] h-[40px]"></i>
            </div>
            <h3 class="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Your Turn</h3>
            <p class="text-2xl font-black text-slate-800 italic">&quot;${escapeHtml(stage === "word" ? w.text : (state.drillTargetText || w.text))}&quot;</p>
            <p class="text-slate-400 font-bold text-xs uppercase mt-6 tracking-widest">Listening for pronunciation...</p>
          </div>
        ` : `
          <div class="max-w-md">
            <h3 class="text-2xl font-black text-slate-800 mb-4">Stage ${stageNum} Goal</h3>
            <p class="text-slate-600 font-medium mb-10 leading-relaxed">${escapeHtml(goalText)}</p>
            <button id="btnBeginStage" class="px-12 py-5 bg-blue-600 text-white rounded-3xl text-xl font-black shadow-2xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
              Begin Stage Drill
            </button>
          </div>
        `}
      </div>

      ${recentAttempts.length ? `
        <div class="max-h-[300px] overflow-y-auto space-y-4 pr-4 custom-scrollbar">
          <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white sticky top-0 py-2">Attempt Log</h4>
          ${recentAttempts.map(m => {
            const sc = m.feedback.score;
            const trophy = sc >= 90 ? `<i data-lucide="trophy" class="w-[24px] h-[24px] text-yellow-500 shrink-0"></i>` : ``;
            return `
              <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all">
                <div class="w-12 h-12 shrink-0 flex items-center justify-center rounded-full border-2 font-black text-sm ${getScoreColor(sc)} shadow-inner bg-white">${sc}</div>
                <div class="flex-1">
                  <p class="text-base font-bold text-slate-800 italic group-hover:text-blue-600 transition-colors">&quot;${escapeHtml(m.text)}&quot;</p>
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
      // best-effort voice selection
      const voices = window.speechSynthesis.getVoices?.() || [];
      const v = voices.find(vv => (vv.lang || "").toLowerCase().startsWith(state.selectedLanguage.code)) || voices[0];
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
      // Graceful fallback: no mic support, auto-prompt user to use Demo.
      setError("This browser doesn't support Speech Recognition. Switch to Demo Mode for instant practice.");
      state.isSessionActive = false;
      renderAll();
      return;
    }

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
      // end after one utterance; user can press Start again
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

    ensureIcons();
  }

  // Boot
  wire();
  // If there was no prior selection, keep defaults
  renderAll();
  ensureIcons();

  if (state.keyValid && (state.apiKey || '').trim()) serverLoadLatest();

})();
