

// --- Backend sync (local-first). We intentionally do NOT sync API keys. ---
function buildBackendPayload(){
  return {
    model: state.model,
    history: state.history,
    chatMessages: state.chatMessages
  };
}

function scheduleRemoteSync(){
  try{ window.NexusAppData?.saveDebounced?.("floraguide-ai", buildBackendPayload(), 1200); }catch(_e){}
}

async function hydrateFromBackendIfNeeded(){
  try{
    // Only hydrate if local history/chat are empty
    const hasLocalHistory = !!localStorage.getItem(HISTORY_STORE);
    const hasLocalChat = !!localStorage.getItem(CHAT_STORE);
    if(hasLocalHistory || hasLocalChat) return false;

    const remote = await window.NexusAppData?.loadLatest?.("floraguide-ai");
    const p = remote?.payload;
    if(p && (Array.isArray(p.history) || Array.isArray(p.chatMessages) || p.model)){
      if(Array.isArray(p.history)) localStorage.setItem(HISTORY_STORE, JSON.stringify(p.history));
      if(Array.isArray(p.chatMessages)) localStorage.setItem(CHAT_STORE, JSON.stringify(p.chatMessages));
      if(typeof p.model === 'string') localStorage.setItem(MODEL_STORE, p.model);
      return true;
    }
  }catch(_e){}
}
// FloraGuide AI — Vanilla, Netlify drag/drop safe (no build step).


// Storage keys
const KEY_STORE = "floraguide_apiKey_v1";
const MODEL_STORE = "floraguide_model_v1";
const HISTORY_STORE = "flora_history";

const DEFAULT_MODEL = "gemini-1.5-flash"; // user can change in settings

const $ = (id) => document.getElementById(id);

const state = {
  tab: "dashboard", // dashboard | identify | chat | history | compare | guides
  online: navigator.onLine,
  apiKey: localStorage.getItem(KEY_STORE) || "",
  model: localStorage.getItem(MODEL_STORE) || DEFAULT_MODEL,
  notifications: [],
  // Identify
  forensicMode: "general",
  imageFile: null,
  imageDataUrl: null,
  analyzing: false,
  result: null,
  // History
  history: [],
  // Compare
  compare: [],
  // Chat
  chatInput: "",
  chatBusy: false,
  chatMessages: [] // {role:'user'|'model', text}
};
function normalizeCare(care){
  const c = care && typeof care === "object" ? care : {};
  return {
    light: c.light || "",
    water: c.water || "",
    soil: c.soil || "",
    temperature: c.temperature || "",
    humidity: c.humidity || "",
    fertilizer: c.fertilizer || ""
  };
}

function normalizeIssue(issue){
  const sev = String(issue?.severity || "low").toLowerCase();
  return {
    title: String(issue?.title || "Issue"),
    severity: ["low","medium","high"].includes(sev) ? sev : "low",
    notes: String(issue?.notes || "")
  };
}

function normalizeDiagnosisCandidate(candidate){
  const indicators = Array.isArray(candidate?.indicators) ? candidate.indicators.map(String).filter(Boolean) : [];
  const nextSteps = Array.isArray(candidate?.nextSteps) ? candidate.nextSteps.map(String).filter(Boolean) : [];
  return {
    name: String(candidate?.name || "Unknown"),
    scientificName: String(candidate?.scientificName || ""),
    confidence: clampConfidence(candidate?.confidence),
    summary: String(candidate?.summary || ""),
    reasoning: String(candidate?.reasoning || candidate?.summary || ""),
    indicators,
    care: normalizeCare(candidate?.care),
    issues: Array.isArray(candidate?.issues) ? candidate.issues.map(normalizeIssue) : [],
    nextSteps
  };
}

function normalizePlantData(raw){
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackCandidate = normalizeDiagnosisCandidate(source);
  const diagnoses = Array.isArray(source.diagnoses) && source.diagnoses.length
    ? source.diagnoses.map(normalizeDiagnosisCandidate)
    : [fallbackCandidate];
  diagnoses.sort((a,b)=>b.confidence-a.confidence);
  return {
    overview: String(source.overview || source.summary || diagnoses[0]?.summary || ""),
    uncertainty: String(source.uncertainty || ""),
    evidenceGaps: Array.isArray(source.evidenceGaps) ? source.evidenceGaps.map(String).filter(Boolean) : [],
    diagnoses
  };
}

function toast(type, title, message){
  const id = crypto.randomUUID();
  state.notifications.push({ id, type, title, message });
  renderToasts();
  setTimeout(()=>{
    state.notifications = state.notifications.filter(n=>n.id!==id);
    renderToasts();
  }, 4200);
}

function loadHistory(){
  try{
    const raw = localStorage.getItem(HISTORY_STORE);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    localStorage.removeItem(HISTORY_STORE);
    return [];
}

function saveHistory(){
  try{
    localStorage.setItem(HISTORY_STORE, JSON.stringify(state.history));
  }catch(e){
    console.warn("History persist failed", e);
    toast("warning","Storage","Unable to persist history on this device.");
  }
}

function loadChat(){
  try{
    const raw = localStorage.getItem(CHAT_STORE);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    localStorage.removeItem(CHAT_STORE);
    return [];
  }
}

function saveChat(){
  try{
    localStorage.setItem(CHAT_STORE, JSON.stringify(state.chatMessages));
  }catch(e){
    console.warn("Chat persist failed", e);
  }
}

function setTab(tab){
  state.tab = tab;
  render();
}

function setKey(k){
  state.apiKey = k.trim();
  localStorage.setItem(KEY_STORE, state.apiKey);
  closeModal("settingsModal");
  toast("success","Auth","Key saved. Live mode enabled.");
  render();
}

function setModel(m){
  state.model = (m||"").trim() || DEFAULT_MODEL;
  localStorage.setItem(MODEL_STORE, state.model);
  render();
}

// ---------- Gemini calls (direct, user-provided key) ----------
async function geminiGenerate(parts){
  if(!state.apiKey){
    throw new Error("Missing API key. Open Settings → paste your key.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(state.model)}:generateContent?key=${encodeURIComponent(state.apiKey)}`;
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type":"application/json" },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error(t || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("") || "";
  return text;
}

async function analyzePlant(){
  if(!state.imageDataUrl){
    toast("warning","Identify","Select an image first.");
    return;
  }
  state.analyzing = true;
  state.result = null;
  render();

  try{
    const base64 = state.imageDataUrl.split(",")[1] || "";
    const mime = (state.imageFile && state.imageFile.type) ? state.imageFile.type : "image/jpeg";

    const instruction = `
You are Flora Forensics — a botanical analyst.
Return STRICT JSON only (no markdown).
Schema:
{
  "overview": string,
  "uncertainty": string,
  "evidenceGaps": string[],
function compareView(){
  const list = state.compare;
  return `
  <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
    <div class="flex items-center justify-between gap-3">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-code-compare text-slate-700"></i> Compare
      </div>
      <button id="clearCompare" class="btnGhost rounded-2xl px-4 py-2 text-sm font-semibold">Clear compare</button>
    </div>

    ${list.length < 2 ? `
      <div class="mt-4 text-slate-600 text-sm">
        Add at least <b>two</b> dossiers from History to compare.
      </div>
    ` : `
      <div class="mt-4 grid lg:grid-cols-${Math.min(3, list.length)} gap-3">
        ${list.slice(0,3).map(item=>`<div>${renderResult(item.plantData)}</div>`).join("")}
      </div>
    `}
  </div>`;
}

function chatView(){
  const msgs = state.chatMessages;
  return `
  <div class="grid lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-comments text-slate-700"></i> Garden Chat
      </div>

      <div id="chatScroll" class="mt-4 rounded-2xl border border-slate-900/10 bg-white/55 p-4 h-[420px] overflow-auto">
        ${msgs.length ? msgs.map(m=>chatBubble(m)).join("") : `<div class="text-slate-600 text-sm">Ask anything about plant care, pests, soil mixes, watering schedules…</div>`}
      </div>

      <div class="mt-3 flex gap-2">
        <input id="chatInput" value="${escapeHtml(state.chatInput)}" placeholder="Ask Flora Forensics…" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 text-sm" />
        <button id="chatSend" class="btnPrimary rounded-2xl px-5 py-3 text-sm font-semibold ${state.chatBusy ? "opacity-70 cursor-not-allowed" : ""}">
          ${state.chatBusy ? "…" : "Send"}
        </button>
      </div>

      <div class="mt-2 text-xs text-slate-600">Key required for live chat. ${state.apiKey ? "Key detected ✅" : "No key set."}</div>
    </div>

    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-shield-leaf text-emerald-700"></i> Safety
      </div>
      <div class="mt-3 text-sm text-slate-700 leading-relaxed">
        This tool provides general gardening guidance. For toxic ingestion or severe plant disease, consult professionals.
      </div>

      <button id="clearChat" class="mt-4 btnGhost rounded-2xl px-4 py-2 text-sm font-semibold w-full">Clear chat</button>
    </div>
  </div>`;
}

function chatBubble(m){
  const isUser = m.role==="user";
  const align = isUser ? "justify-end" : "justify-start";
  const bg = isUser ? "bg-emerald-500/15 border-emerald-600/20" : "bg-slate-900/5 border-slate-900/10";
  const label = isUser ? "YOU" : "FLORA";
  return `<div class="flex ${align} mb-2">
    <div class="max-w-[92%] rounded-2xl border ${bg} px-4 py-3">
      <div class="mono text-[10px] text-slate-600 mb-1">${label}</div>
      <div class="text-sm text-slate-800 whitespace-pre-wrap">${escapeHtml(m.text||"")}</div>
    </div>
  </div>`;
}

function settingsModal(){
  const keyMasked = state.apiKey ? (state.apiKey.slice(0,4)+"••••••••"+state.apiKey.slice(-4)) : "";
  return `
  <div id="settingsModal" class="fixed inset-0 hidden items-center justify-center p-4">
    <div class="fixed inset-0 modalBackdrop"></div>
    <div class="relative max-w-lg w-full glass rounded-3xl border border-white/20 shadow-soft overflow-hidden">
      <div class="p-5 border-b border-slate-900/10 flex items-center justify-between">
        <div class="font-semibold text-slate-900 flex items-center gap-2"><i class="fa-solid fa-gear"></i> Settings</div>
        <button data-close="settingsModal" class="btnGhost rounded-2xl px-3 py-2 text-sm font-semibold">Close</button>
      </div>
      <div class="p-5 space-y-4">
        <div class="rounded-2xl border border-slate-900/10 bg-white/55 p-4">
          <div class="text-sm font-semibold text-slate-900">Provider Key</div>
          <div class="text-xs text-slate-600 mt-1">Paste your key to enable live analysis & chat. Stored locally on this device.</div>

          <div class="mt-3 flex gap-2">
            <input id="apiKeyInput" placeholder="Paste key…" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/80 px-4 py-3 text-sm mono" />
            <button id="saveKeyBtn" class="btnPrimary rounded-2xl px-4 py-3 text-sm font-semibold">Save</button>
          </div>

          ${state.apiKey ? `<div class="mt-2 text-xs text-slate-600 mono">Saved: ${escapeHtml(keyMasked)}</div>` : `<div class="mt-2 text-xs text-slate-600 mono">No key saved.</div>`}
function chatView(){
  const msgs = state.chatMessages;
  return `
  <div class="grid lg:grid-cols-3 gap-4">
    <div class="lg:col-span-2 glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-comments text-slate-700"></i> Garden Chat
      </div>

      <div id="chatScroll" class="mt-4 rounded-2xl border border-slate-900/10 bg-white/55 p-4 h-[420px] overflow-auto">
        ${msgs.length ? msgs.map(m=>chatBubble(m)).join("") : `<div class="text-slate-600 text-sm">Ask anything about plant care, pests, soil mixes, watering schedules…</div>`}
      </div>

      <div class="mt-3 flex gap-2">
        <input id="chatInput" value="${escapeHtml(state.chatInput)}" placeholder="Ask Flora Forensics…" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3 text-sm" />
        <button id="chatSend" class="btnPrimary rounded-2xl px-5 py-3 text-sm font-semibold ${state.chatBusy ? "opacity-70 cursor-not-allowed" : ""}">
          ${state.chatBusy ? "…" : "Send"}
        </button>
      </div>

      <div class="mt-2 text-xs text-slate-600">Key required for live chat. ${state.apiKey ? "Key detected ✅" : "No key set."}</div>
    </div>

    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-shield-leaf text-emerald-700"></i> Safety
      </div>
      <div class="mt-3 text-sm text-slate-700 leading-relaxed">
        This tool provides general gardening guidance. For toxic ingestion or severe plant disease, consult professionals.
      </div>

      <button id="clearChat" class="mt-4 btnGhost rounded-2xl px-4 py-2 text-sm font-semibold w-full">Clear chat</button>
    </div>
  </div>`;
}

function chatBubble(m){
  const isUser = m.role==="user";
  const align = isUser ? "justify-end" : "justify-start";
  const bg = isUser ? "bg-emerald-500/15 border-emerald-600/20" : "bg-slate-900/5 border-slate-900/10";
  const label = isUser ? "YOU" : "FLORA";
  return `<div class="flex ${align} mb-2">
    <div class="max-w-[92%] rounded-2xl border ${bg} px-4 py-3">
      <div class="mono text-[10px] text-slate-600 mb-1">${label}</div>
      <div class="text-sm text-slate-800 whitespace-pre-wrap">${escapeHtml(m.text||"")}</div>
    </div>
  </div>`;
}

function settingsModal(){
  const keyMasked = state.apiKey ? (state.apiKey.slice(0,4)+"••••••••"+state.apiKey.slice(-4)) : "";
  return `
  <div id="settingsModal" class="fixed inset-0 hidden items-center justify-center p-4">
    <div class="fixed inset-0 modalBackdrop"></div>
    <div class="relative max-w-lg w-full glass rounded-3xl border border-white/20 shadow-soft overflow-hidden">
      <div class="p-5 border-b border-slate-900/10 flex items-center justify-between">
        <div class="font-semibold text-slate-900 flex items-center gap-2"><i class="fa-solid fa-gear"></i> Settings</div>
        <button data-close="settingsModal" class="btnGhost rounded-2xl px-3 py-2 text-sm font-semibold">Close</button>
      </div>
      <div class="p-5 space-y-4">
        <div class="rounded-2xl border border-slate-900/10 bg-white/55 p-4">
          <div class="text-sm font-semibold text-slate-900">Provider Key</div>
          <div class="text-xs text-slate-600 mt-1">Paste your key to enable live analysis & chat. Stored locally on this device.</div>

          <div class="mt-3 flex gap-2">
            <input id="apiKeyInput" placeholder="Paste key…" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/80 px-4 py-3 text-sm mono" />
            <button id="saveKeyBtn" class="btnPrimary rounded-2xl px-4 py-3 text-sm font-semibold">Save</button>
          </div>

          ${state.apiKey ? `<div class="mt-2 text-xs text-slate-600 mono">Saved: ${escapeHtml(keyMasked)}</div>` : `<div class="mt-2 text-xs text-slate-600 mono">No key saved.</div>`}

// init
async function init(){
  const hydrated = await hydrateFromBackendIfNeeded();
  state.history = loadHistory();
  state.chatMessages = loadChat();
  if(hydrated){
    toast("success","Archive Synced","Recovered local-first plant dossiers from backend sync.");
  }
  render();
}

window.addEventListener("online", ()=>{ state.online=true; toast("success","System Connected","Neural link re-established."); render(); });
window.addEventListener("offline", ()=>{ state.online=false; toast("warning","System Offline","Local protocol initiated."); render(); });

init();
