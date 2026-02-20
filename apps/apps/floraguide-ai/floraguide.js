

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
    const hasLocalHistory = !!localStorage.getItem(LS_KEY_HISTORY);
    const hasLocalChat = !!localStorage.getItem(LS_KEY_CHAT);
    if(hasLocalHistory || hasLocalChat) return false;

    const remote = await window.NexusAppData?.loadLatest?.("floraguide-ai");
    const p = remote?.payload;
    if(p && (Array.isArray(p.history) || Array.isArray(p.chatMessages) || p.model)){
      if(Array.isArray(p.history)) localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(p.history));
      if(Array.isArray(p.chatMessages)) localStorage.setItem(LS_KEY_CHAT, JSON.stringify(p.chatMessages));
      if(typeof p.model === 'string') localStorage.setItem(LS_KEY_MODEL, p.model);
      return true;
    }
  }catch(_e){}
  return false;
}
// FloraGuide AI — Vanilla, Netlify drag/drop safe (no build step).


// Storage keys
const KEY_STORE = "floraguide_apiKey_v1";
const MODEL_STORE = "floraguide_model_v1";
const HISTORY_STORE = "flora_history";
const CHAT_STORE = "flora_chat_history_v1";

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

// ---------- Utilities ----------
function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
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
  "name": string,
  "scientificName": string,
  "confidence": number (0-100),
  "summary": string,
  "care": {
    "light": string,
    "water": string,
    "soil": string,
    "temperature": string,
    "humidity": string,
    "fertilizer": string
  },
  "issues": [{ "title": string, "severity": "low"|"medium"|"high", "notes": string }],
  "nextSteps": string[]
}
Mode: ${state.forensicMode === "pathogen" ? "Focus on disease/pathogen signs and treatments." : "General identification and care."}
If unsure, still fill fields with best effort and set confidence lower.
`;
    const text = await geminiGenerate([
      { text: instruction },
      { inline_data: { mime_type: mime, data: base64 } }
    ]);

    let parsed;
    try{
      parsed = JSON.parse(text.trim());
    }catch{
      // salvage JSON if wrapped
      const m = text.match(/\{[\s\S]*\}/);
      if(!m) throw new Error("Model returned non-JSON.");
      parsed = JSON.parse(m[0]);
    }

    // normalize
    const plant = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      imageUrl: state.imageDataUrl,
      plantData: parsed
    };

    state.result = plant;
    state.history = [plant, ...state.history].slice(0, 200);
    saveHistory();
    toast("success","Archive Updated",`Dossier for ${parsed?.name || "Unknown specimen"} saved.`);
  }catch(e){
    console.error(e);
    toast("error","Identify Failed", (e && e.message) ? e.message : "Unknown error");
  }finally{
    state.analyzing = false;
    render();
  }
}

async function sendChat(){
  const msg = (state.chatInput || "").trim();
  if(!msg) return;
  state.chatInput = "";
  state.chatBusy = true;
  state.chatMessages.push({ role:"user", text: msg });
  render();
  saveChat();

  try{
    const history = state.chatMessages.slice(-12).map(m=>`${m.role==="user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
    const instruction = `You are Flora Forensics — helpful, concise, practical gardening assistant.
Answer the user's question. If you reference facts, keep it general and safe. Provide actionable steps.
Conversation:\n${history}\n\nRespond as Assistant:`;
    const reply = await geminiGenerate([{ text: instruction }]);
    state.chatMessages.push({ role:"model", text: reply.trim() || "(no reply)" });
    saveChat();
  }catch(e){
    console.error(e);
    toast("error","Chat Failed", (e && e.message) ? e.message : "Unknown error");
  }finally{
    state.chatBusy = false;
    render();
  }
}

// ---------- UI ----------
function badge(){
  const keyOk = !!state.apiKey;
  const online = state.online;
  const cls = keyOk ? "badgeLive" : "badgeOff";
  const label = keyOk ? "LIVE" : "KEY NEEDED";
  const net = online ? "ONLINE" : "OFFLINE";
  return `
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}">${label}</span>
      <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${online ? "badgeLive" : "badgeOff"}">${net}</span>
    </div>
  `;
}

function topBar(){
  return `
  <div class="max-w-6xl mx-auto px-4 pt-6">
    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 overflow-hidden">
      <div class="p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-600/20 flex items-center justify-center">
            <i class="fa-solid fa-leaf text-emerald-700"></i>
          </div>
          <div>
            <div class="text-slate-900 font-semibold text-lg leading-tight">Flora Forensics</div>
            <div class="text-slate-600 text-sm mono">Advanced Botanical Analysis</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          ${badge()}
          <button id="openSettings" class="btnGhost rounded-2xl px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <i class="fa-solid fa-gear"></i><span>Settings</span>
          </button>
        </div>
      </div>

      <div class="px-5 pb-5">
        <div class="flex flex-wrap gap-2">
          ${tabBtn("dashboard","Dashboard","fa-gauge")}
          ${tabBtn("identify","Identify","fa-microscope")}
          ${tabBtn("chat","Garden Chat","fa-comments")}
          ${tabBtn("history","History","fa-box-archive")}
          ${tabBtn("compare","Compare","fa-code-compare")}
        </div>
      </div>
    </div>
  </div>`;
}

function tabBtn(id,label,icon){
  const active = state.tab===id ? "tabActive" : "";
  return `<button data-tab="${id}" class="noSelect rounded-2xl border border-slate-900/10 px-3.5 py-2 text-sm font-semibold flex items-center gap-2 ${active}">
    <i class="fa-solid ${icon} text-slate-700"></i><span>${label}</span>
  </button>`;
}

function dashboardView(){
  const count = state.history.length;
  const live = state.apiKey ? "LIVE" : "KEY REQUIRED";
  return `
  <div class="grid lg:grid-cols-3 gap-4">
    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2"><i class="fa-solid fa-satellite-dish text-emerald-700"></i> System Status</div>
      <div class="mt-3 text-sm text-slate-700 leading-relaxed">
        Mode: <span class="mono font-semibold">${live}</span><br/>
        Network: <span class="mono font-semibold">${state.online ? "ONLINE" : "OFFLINE"}</span><br/>
        Model: <span class="mono font-semibold">${escapeHtml(state.model)}</span>
      </div>
      <div class="mt-4 text-xs text-slate-600">
        If you're using this app, open <b>Settings</b> and paste your provider key to enable live analysis.
      </div>
    </div>

    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2"><i class="fa-solid fa-clipboard-list text-slate-700"></i> Archive</div>
      <div class="mt-3 text-3xl font-bold text-slate-900">${count}</div>
      <div class="text-sm text-slate-600">Saved plant dossiers</div>
      <button class="mt-4 btnPrimary rounded-2xl px-4 py-2 text-sm font-semibold" data-go="identify">
        Run new scan
      </button>
    </div>

    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2"><i class="fa-solid fa-seedling text-emerald-700"></i> Quick Start</div>
      <ol class="mt-3 text-sm text-slate-700 list-decimal pl-5 space-y-1">
        <li>Open <b>Identify</b> and upload a photo.</li>
        <li>Tap <b>Analyze</b> to generate a dossier.</li>
        <li>Save to <b>History</b> and compare specimens.</li>
      </ol>
      <div class="mt-3 text-xs text-slate-600">Best results: clear leaf + stem + any flowers; good lighting.</div>
    </div>
  </div>`;
}

function identifyView(){
  const img = state.imageDataUrl ? `<img src="${state.imageDataUrl}" class="w-full rounded-2xl border border-slate-900/10 shadow-soft" alt="uploaded"/>` : `
    <div class="w-full rounded-2xl border border-dashed border-slate-900/20 bg-white/40 p-10 text-center text-slate-600">
      <i class="fa-solid fa-image text-2xl mb-3"></i>
      <div class="font-semibold">Upload a plant photo</div>
      <div class="text-sm">Leaf + stem + flower if possible</div>
    </div>
  `;

  const modeBtn = (id,label) => {
    const active = state.forensicMode===id ? "tabActive" : "";
    return `<button class="rounded-2xl border border-slate-900/10 px-3 py-2 text-sm font-semibold ${active}" data-mode="${id}">${label}</button>`;
  };

  const result = state.result ? renderResult(state.result.plantData) : "";

  return `
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="flex items-center justify-between gap-3">
        <div class="text-slate-900 font-semibold flex items-center gap-2">
          <i class="fa-solid fa-microscope text-emerald-700"></i> Identify
        </div>
        <div class="flex gap-2">
          ${modeBtn("general","General")}
          ${modeBtn("pathogen","Pathogen")}
        </div>
      </div>

      <div class="mt-4 space-y-3">
        ${img}
        <div class="flex flex-wrap gap-2">
          <input id="fileInput" type="file" accept="image/*" class="hidden"/>
          <button id="pickFile" class="btnGhost rounded-2xl px-4 py-2 text-sm font-semibold">
            <i class="fa-solid fa-upload mr-2"></i>Choose image
          </button>
          <button id="analyzeBtn" class="btnPrimary rounded-2xl px-4 py-2 text-sm font-semibold ${state.analyzing ? "opacity-70 cursor-not-allowed" : ""}">
            <i class="fa-solid fa-bolt mr-2"></i>${state.analyzing ? "Analyzing…" : "Analyze"}
          </button>
          <button id="clearImage" class="btnGhost rounded-2xl px-4 py-2 text-sm font-semibold">
            Clear
          </button>
        </div>
        <div class="text-xs text-slate-600 mono">
          Live key required for analysis. ${state.apiKey ? "Key detected ✅" : "No key set."}
        </div>
      </div>
    </div>

    <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-file-shield text-slate-700"></i> Dossier
      </div>
      <div class="mt-4">
        ${state.analyzing ? loadingPanel() : (result || emptyDossier())}
      </div>
    </div>
  </div>`;
}

function loadingPanel(){
  const msgs = ["INITIALIZING OPTICS…","ISOLATING GENETIC SEQUENCES…","CALIBRATING SPECIES DELTA…","EXTRACTING GROWTH VECTORS…","ENCRYPTING DATA DOSSIER…"];
  const msg = msgs[Math.floor(Date.now()/900)%msgs.length];
  return `<div class="rounded-2xl border border-slate-900/10 bg-white/55 p-6">
    <div class="mono text-xs text-slate-700">${escapeHtml(msg)}</div>
    <div class="mt-4 h-2 rounded-full bg-slate-900/10 overflow-hidden">
      <div class="h-2 w-2/3 bg-emerald-500/70 animate-pulse"></div>
    </div>
    <div class="mt-4 text-sm text-slate-700">Analyzing image and generating care protocol…</div>
  </div>`;
}

function emptyDossier(){
  return `<div class="rounded-2xl border border-dashed border-slate-900/20 bg-white/40 p-8 text-center text-slate-600">
    <div class="font-semibold">No dossier yet</div>
    <div class="text-sm">Run an Identify scan to generate plant details.</div>
  </div>`;
}

function renderResult(p){
  const care = p.care || {};
  const issues = Array.isArray(p.issues) ? p.issues : [];
  const next = Array.isArray(p.nextSteps) ? p.nextSteps : [];

  return `
    <div class="rounded-2xl border border-slate-900/10 bg-white/55 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-xl font-bold text-slate-900">${escapeHtml(p.name||"Unknown")}</div>
          <div class="text-sm text-slate-600 italic">${escapeHtml(p.scientificName||"")}</div>
        </div>
        <div class="px-3 py-1.5 rounded-full text-[12px] font-semibold ${(+p.confidence||0)>=70 ? "badgeLive" : "badgeOff"}">
          Confidence ${escapeHtml(String(p.confidence??"—"))}%
        </div>
      </div>

      <div class="mt-3 text-sm text-slate-700 leading-relaxed">${escapeHtml(p.summary||"")}</div>

      <div class="mt-4 grid sm:grid-cols-2 gap-3">
        ${careItem("Light","fa-sun",care.light)}
        ${careItem("Water","fa-droplet",care.water)}
        ${careItem("Soil","fa-mountain-sun",care.soil)}
        ${careItem("Temp","fa-temperature-half",care.temperature)}
        ${careItem("Humidity","fa-wind",care.humidity)}
        ${careItem("Fertilizer","fa-flask",care.fertilizer)}
      </div>

      ${issues.length ? `
      <div class="mt-4">
        <div class="font-semibold text-slate-900 mb-2">Issues</div>
        <div class="space-y-2">
          ${issues.map(i=>issueItem(i)).join("")}
        </div>
      </div>` : ""}

      ${next.length ? `
      <div class="mt-4">
        <div class="font-semibold text-slate-900 mb-2">Next steps</div>
        <ul class="list-disc pl-5 text-sm text-slate-700 space-y-1">
          ${next.map(s=>`<li>${escapeHtml(String(s))}</li>`).join("")}
        </ul>
      </div>` : ""}
    </div>
  `;
}

function careItem(label,icon,value){
  return `<div class="rounded-2xl border border-slate-900/10 bg-white/55 p-3">
    <div class="text-xs text-slate-500 mono flex items-center gap-2"><i class="fa-solid ${icon}"></i>${escapeHtml(label.toUpperCase())}</div>
    <div class="text-sm font-semibold text-slate-900 mt-1">${escapeHtml(value||"—")}</div>
  </div>`;
}

function issueItem(i){
  const sev = (i.severity||"low").toLowerCase();
  const cls = sev==="high" ? "badgeOff" : sev==="medium" ? "bg-amber-500/15 text-amber-700 border border-amber-600/25" : "badgeLive";
  return `<div class="rounded-2xl border border-slate-900/10 bg-white/55 p-3">
    <div class="flex items-start justify-between gap-3">
      <div class="font-semibold text-slate-900">${escapeHtml(i.title||"Issue")}</div>
      <div class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}">${escapeHtml(sev.toUpperCase())}</div>
    </div>
    <div class="text-sm text-slate-700 mt-1">${escapeHtml(i.notes||"")}</div>
  </div>`;
}

function historyView(){
  if(!state.history.length){
    return `<div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-8 text-center text-slate-600">
      <div class="font-semibold">No saved dossiers</div>
      <div class="text-sm">Run Identify scans to build your archive.</div>
    </div>`;
  }
  return `
  <div class="glass shadow-soft rounded-3xl border border-slate-900/10 p-5">
    <div class="flex items-center justify-between gap-3">
      <div class="text-slate-900 font-semibold flex items-center gap-2">
        <i class="fa-solid fa-box-archive text-slate-700"></i> History
      </div>
      <button id="clearHistory" class="btnGhost rounded-2xl px-4 py-2 text-sm font-semibold">Clear history</button>
    </div>
    <div class="mt-4 grid md:grid-cols-2 gap-3">
      ${state.history.slice(0,50).map(h=>historyCard(h)).join("")}
    </div>
  </div>`;
}

function historyCard(h){
  const p = h.plantData || {};
  return `<div class="rounded-3xl border border-slate-900/10 bg-white/65 overflow-hidden">
    ${h.imageUrl ? `<img src="${h.imageUrl}" class="w-full h-40 object-cover" alt="plant"/>` : ""}
    <div class="p-4">
      <div class="font-bold text-slate-900">${escapeHtml(p.name||"Unknown")}</div>
      <div class="text-sm text-slate-600 italic">${escapeHtml(p.scientificName||"")}</div>
      <div class="mt-2 flex flex-wrap gap-2">
        <button class="btnGhost rounded-2xl px-3 py-2 text-xs font-semibold" data-compare="${escapeHtml(h.id)}">
          <i class="fa-solid fa-code-compare mr-2"></i>Compare
        </button>
        <button class="btnGhost rounded-2xl px-3 py-2 text-xs font-semibold" data-open="${escapeHtml(h.id)}">
          <i class="fa-solid fa-file-lines mr-2"></i>Open
        </button>
      </div>
      <div class="mt-2 text-xs text-slate-500 mono">${escapeHtml(new Date(h.timestamp).toLocaleString())}</div>
    </div>
  </div>`;
}

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

          <button id="clearKeyBtn" class="mt-3 btnGhost rounded-2xl px-4 py-2 text-sm font-semibold">Clear key</button>
        </div>

        <div class="rounded-2xl border border-slate-900/10 bg-white/55 p-4">
          <div class="text-sm font-semibold text-slate-900">Model</div>
          <div class="text-xs text-slate-600 mt-1">Default: ${DEFAULT_MODEL}. You can override if your key supports others.</div>
          <div class="mt-3 flex gap-2">
            <input id="modelInput" value="${escapeHtml(state.model)}" class="flex-1 rounded-2xl border border-slate-900/10 bg-white/80 px-4 py-3 text-sm mono" />
            <button id="saveModelBtn" class="btnGhost rounded-2xl px-4 py-3 text-sm font-semibold">Update</button>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-900/10 bg-white/55 p-4">
          <div class="text-sm font-semibold text-slate-900">About</div>
          <div class="text-xs text-slate-600 mt-1">Static build. No backend required. Users provide their own key.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function toasts(){
  return `<div id="toastArea" class="fixed bottom-4 left-4 right-4 z-[60] flex flex-col gap-2 items-start"></div>`;
}

function renderToasts(){
  const area = $("toastArea");
  if(!area) return;
  area.innerHTML = state.notifications.map(n=>{
    const icon = n.type==="success" ? "fa-circle-check" : n.type==="error" ? "fa-circle-xmark" : "fa-triangle-exclamation";
    return `<div class="toast rounded-2xl px-4 py-3 text-sm shadow-soft border border-white/10 max-w-lg w-full">
      <div class="flex items-start gap-3">
        <i class="fa-solid ${icon} mt-0.5"></i>
        <div>
          <div class="font-semibold">${escapeHtml(n.title||"")}</div>
          <div class="text-white/80">${escapeHtml(n.message||"")}</div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function main(){
  const wrap = `
    ${topBar()}
    <div class="max-w-6xl mx-auto px-4 pb-12 pt-4">
      ${state.tab==="dashboard" ? dashboardView() :
        state.tab==="identify" ? identifyView() :
        state.tab==="chat" ? chatView() :
        state.tab==="history" ? historyView() :
        state.tab==="compare" ? compareView() :
        dashboardView()}
    </div>
    ${settingsModal()}
    ${toasts()}
  `;
  return wrap;
}

function openModal(id){
  const el = $(id);
  if(!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex");
}
function closeModal(id){
  const el = $(id);
  if(!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
}

function wire(){
  // tabs
  document.querySelectorAll("[data-tab]").forEach(btn=>{
    btn.addEventListener("click", ()=> setTab(btn.getAttribute("data-tab")));
  });
  // go buttons
  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.addEventListener("click", ()=> setTab(btn.getAttribute("data-go")));
  });

  // settings
  const openSettings = $("openSettings");
  openSettings?.addEventListener("click", ()=>{
    openModal("settingsModal");
    // prefill
    const api = $("apiKeyInput");
    if(api) api.value = "";
  });

  document.querySelectorAll("[data-close]").forEach(btn=>{
    btn.addEventListener("click", ()=> closeModal(btn.getAttribute("data-close")));
  });

  $("saveKeyBtn")?.addEventListener("click", ()=>{
    const v = $("apiKeyInput")?.value || "";
    if(!v.trim()){
      toast("warning","Auth","Paste a key first.");
      return;
    }
    setKey(v);
  });
  $("clearKeyBtn")?.addEventListener("click", ()=>{
    localStorage.removeItem(KEY_STORE);
    state.apiKey="";
    toast("success","Auth","Key cleared.");
    render();
  });
  $("saveModelBtn")?.addEventListener("click", ()=>{
    const v = $("modelInput")?.value || "";
    setModel(v);
    toast("success","Model","Updated.");
  });

  // Identify controls
  $("pickFile")?.addEventListener("click", ()=> $("fileInput")?.click());
  $("fileInput")?.addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    state.imageFile = file;
    const reader = new FileReader();
    reader.onload = ()=> {
      state.imageDataUrl = reader.result;
      render();
    };
    reader.readAsDataURL(file);
  });

  document.querySelectorAll("[data-mode]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.forensicMode = btn.getAttribute("data-mode");
      render();
    });
  });

  $("clearImage")?.addEventListener("click", ()=>{
    state.imageFile=null;
    state.imageDataUrl=null;
    state.result=null;
    render();
  });

  $("analyzeBtn")?.addEventListener("click", ()=>{
    if(state.analyzing) return;
    analyzePlant();
  });

  // History buttons
  $("clearHistory")?.addEventListener("click", ()=>{
    state.history=[];
    saveHistory();
    toast("success","Archive","History cleared.");
    render();
  });

  document.querySelectorAll("[data-open]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-open");
      const item = state.history.find(h=>h.id===id);
      if(!item) return;
      state.result = item;
      state.tab="identify";
      render();
    });
  });

  document.querySelectorAll("[data-compare]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-compare");
      const item = state.history.find(h=>h.id===id);
      if(!item) return;
      if(state.compare.find(x=>x.id===id)) {
        toast("warning","Compare","Already in compare list.");
        return;
      }
      state.compare.push(item);
      toast("success","Compare",`Added ${item.plantData?.name||"specimen"}.`);
      state.tab="compare";
      render();
    });
  });

  $("clearCompare")?.addEventListener("click", ()=>{
    state.compare=[];
    render();
  });

  // Chat
  const chatInput = $("chatInput");
  chatInput?.addEventListener("input", (e)=>{ state.chatInput = e.target.value; });

  chatInput?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      if(state.chatBusy) return;
      sendChat();
    }
  });

  $("chatSend")?.addEventListener("click", ()=>{
    if(state.chatBusy) return;
    sendChat();
  });

  $("clearChat")?.addEventListener("click", ()=>{
    state.chatMessages=[];
    saveChat();
    render();
  });

  // scroll chat to bottom
  const sc = $("chatScroll");
  if(sc) sc.scrollTop = sc.scrollHeight;

  renderToasts();
}

function render(){
  const mount = $("app");
  if(!mount) return;
  mount.innerHTML = main();
  wire();
}

// init
state.history = loadHistory();
state.chatMessages = loadChat();

window.addEventListener("online", ()=>{ state.online=true; toast("success","System Connected","Neural link re-established."); render(); });
window.addEventListener("offline", ()=>{ state.online=false; toast("warning","System Offline","Local protocol initiated."); render(); });

render();