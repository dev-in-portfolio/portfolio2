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
