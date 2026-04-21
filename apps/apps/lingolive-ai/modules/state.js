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
