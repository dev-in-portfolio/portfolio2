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
