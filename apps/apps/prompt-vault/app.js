
// ===== Prompt Vault storage =====
// Passcode key is versioned so old/broken states don't collide with new builds.
// Current key (underscored) plus legacy key (compact) supported.
const STORAGE_KEY = "promptVault_passcode_v2_2024";
const STORAGE_KEY_LEGACY = "promptVault_passcode_v22024";

const LS_AUTOBACKUP = "promptVault_autobackup_v1";
const LS_BANNER_DISMISSED = "promptVault_bannerDismissed_v1";
const LS_LAST_BACKUP_TS = "promptVault_lastBackupTs_v1";

// Legacy keys to wipe (both generic and older Prompt Vault versions)
[
  "promptVaultPasscode",
  "vaultPass",
  "vault_passcode",
  "promptVault_passcode",
  "pv_passcode_v1",
  "pv_passcode_custom_v1"
].forEach(k => {
  try { localStorage.removeItem(k); } catch (_) {}
});

// Storage keys used by THIS build
const LS_PASS = STORAGE_KEY;
const LS_CUSTOM = `${STORAGE_KEY}__custom`;
const LS_PASS_LEGACY = STORAGE_KEY_LEGACY;
const LS_CUSTOM_LEGACY = `${STORAGE_KEY_LEGACY}__custom`;

// Prompt data (kept stable)
const LS_DATA = "pv_prompts_v1";
const DEFAULT_PASS = "1234";

// Build marker (helps verify which ZIP is actually running in the browser)

// Debug + emergency controls (safe to expose; no prompt contents)
// If the keypad/UI gets stuck on mobile, you can run `unlockVault()`.
window.unlockVault = function unlockVault(){
  try { setLocked(false); } catch(e) {}
  try {
    const lock = $("lock");
    if(lock){ lock.hidden = true; lock.style.display = "none"; }
  } catch(e) {}
  return true;
};

window.pvDebug = function pvDebug(){
  try {
    return {
      locked: state.locked,
      pinLen: state.pin.length,
      stored: localStorage.getItem(LS_PASS),
      storedLegacy: localStorage.getItem(LS_PASS_LEGACY),
      customFlag: localStorage.getItem(LS_CUSTOM),
      customFlagLegacy: localStorage.getItem(LS_CUSTOM_LEGACY),
      defaultPass: DEFAULT_PASS,
      hasCustom: hasCustomPass(),
    };
  } catch(e){
    return { error: String(e) };
  }
};

const $ = (id) => document.getElementById(id);

const state = {
  locked: true,
  pin: "",
  prompts: [],
  q: "",
  selectedTags: new Set(),
  editingId: null,
  compareLeft: "head",
  compareRight: "draft",
};

function nowISO(){ return new Date().toISOString(); }
function uid(){ return "pv_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16); }

function normalizeRevision(rev, fallbackPrompt){
  const title = String(rev?.title || fallbackPrompt?.title || "(untitled)");
  const tags = Array.isArray(rev?.tags) ? rev.tags.map(t=>String(t).toLowerCase()) : normTags(rev?.tags || fallbackPrompt?.tags || "");
  const body = String(rev?.body || fallbackPrompt?.body || "");
  const createdAt = rev?.createdAt || fallbackPrompt?.updatedAt || fallbackPrompt?.createdAt || nowISO();
  return {
    id: typeof rev?.id === "string" ? rev.id : uid(),
    title,
    tags,
    body,
    createdAt,
    note: String(rev?.note || "")
  };
}

function normalizeVariant(variant, fallbackPrompt){
  const title = String(variant?.title || fallbackPrompt?.title || "(untitled)");
  const tags = Array.isArray(variant?.tags) ? variant.tags.map(t=>String(t).toLowerCase()) : normTags(variant?.tags || fallbackPrompt?.tags || "");
  const body = String(variant?.body || fallbackPrompt?.body || "");
  const createdAt = variant?.createdAt || fallbackPrompt?.updatedAt || fallbackPrompt?.createdAt || nowISO();
  return {
    id: typeof variant?.id === "string" ? variant.id : uid(),
    title,
    tags,
    body,
    createdAt,
    label: String(variant?.label || title || "Variant"),
    note: String(variant?.note || "")
  };
}

function normalizePromptRecord(p){
  const title = String(p?.title || "(untitled)");
  const tags = Array.isArray(p?.tags) ? p.tags.map(t=>String(t).toLowerCase()) : normTags(p?.tags || "");
  const body = String(p?.body || "");
  const createdAt = p?.createdAt || nowISO();
  const updatedAt = p?.updatedAt || createdAt;
  const base = {
    id: typeof p?.id === "string" ? p.id : uid(),
    title,
    tags,
    body,
    createdAt,
    updatedAt,
    revisions: [],
    variants: []
  };
  const revisions = Array.isArray(p?.revisions) && p.revisions.length
    ? p.revisions.map(rev => normalizeRevision(rev, base))
    : [normalizeRevision({ title, tags, body, createdAt }, base)];
  revisions.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  const variants = Array.isArray(p?.variants)
    ? p.variants.map(variant => normalizeVariant(variant, base))
    : [];
  variants.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  return { ...base, revisions, variants };
}

function normalizePromptCollection(list){
  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .map(normalizePromptRecord)
    .filter(p=>p.body.trim().length > 0)
    .sort((a,b)=> (b.updatedAt||"").localeCompare(a.updatedAt||""));
}

function getPass(){
  return localStorage.getItem(LS_PASS) || DEFAULT_PASS;
}
function setPass(next){
  localStorage.setItem(LS_PASS, next);
  // Mark that the user intentionally changed it away from the default.
  localStorage.setItem(LS_CUSTOM, next === DEFAULT_PASS ? "0" : "1");
}

function hasCustomPass(){
  return localStorage.getItem(LS_CUSTOM) === "1";
}

function ensurePassInitialized(){
  // 0) Migrate legacy compact keys -> current key (one-time).
  // Early builds used LS_PASS_LEGACY / LS_CUSTOM_LEGACY.
  try {
    const current = localStorage.getItem(LS_PASS);
    const legacy = localStorage.getItem(LS_PASS_LEGACY);
    if ((current === null || current === undefined || current === "") && legacy && /^\d{4}$/.test(legacy)){
      localStorage.setItem(LS_PASS, legacy);
      // migrate custom flag if present (only "1" counts as custom)
      const legacyCustom = localStorage.getItem(LS_CUSTOM_LEGACY);
      if (legacyCustom === "1") localStorage.setItem(LS_CUSTOM, "1");
      else if (localStorage.getItem(LS_CUSTOM) === null) localStorage.setItem(LS_CUSTOM, "0");
    }
  } catch { /* ignore */ }

  // If an older/buggy value exists, normalize it.
  const raw = localStorage.getItem(LS_PASS);
  if(raw && !/^\d{4}$/.test(raw)){
    localStorage.removeItem(LS_PASS);
    localStorage.setItem(LS_CUSTOM, "0");
    return;
  }

  // If a valid code exists but the custom-flag is missing (older builds),
  // infer it so users aren't locked out unexpectedly.
  if(raw && /^\d{4}$/.test(raw) && raw !== DEFAULT_PASS){
    if(localStorage.getItem(LS_CUSTOM) === null){
      localStorage.setItem(LS_CUSTOM, "1");
    }
  }

  // If the custom flag exists but is anything other than "1", treat it as not custom.
  // (String "0" is truthy in JS, so we force a strict check everywhere.)
  const flag = localStorage.getItem(LS_CUSTOM);
  if(flag !== null && flag !== "1"){
    localStorage.setItem(LS_CUSTOM, "0");
  }
}

function loadPrompts(){
  try{
    const raw = localStorage.getItem(LS_DATA);
    if(!raw) return [];
    const data = JSON.parse(raw);
    return normalizePromptCollection(data);
  }catch{
    return [];
  }
}
function savePrompts(){
  state.prompts = normalizePromptCollection(state.prompts);
  localStorage.setItem(LS_DATA, JSON.stringify(state.prompts));
  try{ window.NexusAppData?.saveDebounced?.("prompt-vault", { prompts: state.prompts }, 900); }catch(_e){}
}

function getAutoBackupEnabled() {
  const v = localStorage.getItem(LS_AUTOBACKUP);
  if (v === null) return true; // default ON to protect you from "oops I cleared site data"
  return v === "1";
}
function setAutoBackupEnabled(on) {
  localStorage.setItem(LS_AUTOBACKUP, on ? "1" : "0");
}

function maybeAutoBackup(reason) {
  try {
    if (!getAutoBackupEnabled()) return;
    const now = Date.now();
    const last = Number(localStorage.getItem(LS_LAST_BACKUP_TS) || "0");
    // throttle (mobile browsers can choke if we spam downloads)
    if (now - last < 15000) return;
    localStorage.setItem(LS_LAST_BACKUP_TS, String(now));
    downloadBackup(reason);
  } catch (e) {
    console.warn("[PromptVault] Auto-backup failed:", e);
  }
}

function downloadBackup(reason) {
  const payload = {
    kind: "prompt-vault-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    reason: reason || "manual",
    prompts: state.prompts
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `prompt-vault-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
  console.log("[PromptVault] Backup downloaded:", payload.reason);
}

function showStorageWarningBannerIfNeeded() {
  try {
    if (localStorage.getItem(LS_BANNER_DISMISSED) === "1") return;
    const banner = document.getElementById("storageBanner");
    if (!banner) return;
    banner.hidden = false;
    banner.querySelector("[data-action='dismiss']").onclick = () => {
      localStorage.setItem(LS_BANNER_DISMISSED, "1");
      banner.hidden = true;
    };
    banner.querySelector("[data-action='toggleBackup']").onclick = () => {
      const on = !getAutoBackupEnabled();
      setAutoBackupEnabled(on);
      banner.querySelector("[data-slot='backupState']").textContent = on ? "ON" : "OFF";
    };
    banner.querySelector("[data-slot='backupState']").textContent = getAutoBackupEnabled() ? "ON" : "OFF";
  } catch (e) {}
}


function clamp(s, n){
  if(!s) return "";
  return s.length > n ? (s.slice(0, n) + "…") : s;
}

function escapeHtml(str){
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normTags(tagStr){
  return (tagStr || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.toLowerCase());
}

function formatDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit" });
  }catch{
    return "";
  }
}

function setLocked(on){
  state.locked = on;
  const lock = $("lock");
  lock.hidden = !on;
  // Force display toggle too: some Android WebViews ignore `hidden` after certain dialogs.
  lock.style.display = on ? "flex" : "none";
  if(on){
    state.pin = "";
    renderPin();
    $("lockErr").textContent = "";
    // Update message depending on whether a custom passcode already exists.
    const lockMsg = $("lockMsg");
    if(lockMsg){
      if(hasCustomPass()){
        lockMsg.innerHTML = `Passcode already set for this browser.<br><span class="pvLockMsgSmall">Enter it, or hit <b>Reset to 1234</b> to reset locally.</span>`;
      }else{
        lockMsg.innerHTML = `First time? The passcode is <b>1234</b>.<div class="pvLockMsgSmall">(Yes, it’s basic. That’s why you’re about to change it.)</div>`;
      }
    }
  }
}

function renderPin(){
  const dots = Array.from($("pinDots").children);
  dots.forEach((dot,i) => dot.classList.toggle("pvDotOn", i < state.pin.length));
}

function pinPush(d){
  if(state.pin.length >= 4) return;
  state.pin += String(d);
  renderPin();
  if(state.pin.length === 4){
    verifyPin();
  }
}

function pinClear(){
  state.pin = "";
  renderPin();
  $("lockErr").textContent = "";
}

function verifyPin(){
  const stored = getPass();

  // Recovery guarantee:
  // 1234 should ALWAYS get you in, even if an old build stored a different
  // passcode or a custom-flag got stuck.
  if(state.pin === DEFAULT_PASS){
    // Also normalize storage so future unlocks are deterministic.
    setPass(DEFAULT_PASS, false);
    setLocked(false);
    // tiny delay so the last dot flashes
    setTimeout(() => { $("q").focus(); }, 50);
    return;
  }

  // Normal path: if custom code exists, require it.
  const ok = hasCustomPass() ? (state.pin === stored) : false;
  if(ok){
    setLocked(false);
    setTimeout(() => { $("q").focus(); }, 50);
  }else{
    $("lockErr").textContent = "Nope. That code ain’t it.";
    setTimeout(pinClear, 450);
  }
}

function buildKeypad(){
  const kp = $("keypad");
  kp.innerHTML = "";
  const keys = [1,2,3,4,5,6,7,8,9,"⌫",0,"↵"];
  keys.forEach(k=>{
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pvKey";
    b.textContent = String(k);
    b.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      if(k === "⌫"){
        state.pin = state.pin.slice(0,-1);
        renderPin();
        return;
      }
      if(k === "↵"){
        if(state.pin.length === 4) verifyPin();
        return;
      }
      pinPush(k);
    }, { passive: false });
    kp.appendChild(b);
  });

  // Keyboard support
  window.addEventListener("keydown", (e)=>{
    if(!state.locked) return;
    const k = e.key;
    if(/^[0-9]$/.test(k)){ pinPush(k); }
    else if(k === "Backspace"){ state.pin = state.pin.slice(0,-1); renderPin(); }
    else if(k === "Enter"){ if(state.pin.length === 4) verifyPin(); }
    else if(k === "Escape"){ pinClear(); }
  });
}

function openModal(id){
  state.editingId = id || null;
  const m = $("modal");
  m.hidden = false;

  const item = state.prompts.find(p => p.id === id);
  $("modalTitle").textContent = item ? "Edit prompt" : "New prompt";
  $("btnDelete").style.display = item ? "" : "none";

  $("fTitle").value = item?.title || "";
  $("fTags").value = (item?.tags || []).join(", ");
  $("fBody").value = item?.body || "";
  const fe = $("formErr");
  if(fe) fe.textContent = "";
  state.compareLeft = "head";
  state.compareRight = "draft";
  renderRevisionHistory(item);
  renderVariants(item);
  renderComparePanel(item);

  setTimeout(()=> $("fTitle").focus(), 30);
}

function closeModal(){
  $("modal").hidden = true;
  state.editingId = null;
  state.compareLeft = "head";
  state.compareRight = "draft";
}

function upsertPrompt(){
  const title = ($("fTitle").value || "").trim() || "(untitled)";
  const tags = normTags($("fTags").value);
  const body = ($("fBody").value || "").trim();

  if(!body){
    const fe = $("formErr");
    if(fe) fe.textContent = "Give me something to store. (The vault can’t vault empty.)";
    console.warn("[PromptVault] Save blocked: empty body");
    return;
  }

  const ts = nowISO();
  if(state.editingId){
    const i = state.prompts.findIndex(p=>p.id===state.editingId);
    if(i>=0){
      const prev = normalizePromptRecord(state.prompts[i]);
      const changed = prev.title !== title || prev.body !== body || JSON.stringify(prev.tags||[]) !== JSON.stringify(tags);
      const revisions = Array.isArray(prev.revisions) ? prev.revisions.slice() : [];
      if(changed){
        revisions.unshift(normalizeRevision({ title, tags, body, createdAt: ts }, { title, tags, body, updatedAt: ts, createdAt: prev.createdAt }));
      }
      state.prompts[i] = { ...prev, title, tags, body, updatedAt: ts, revisions, variants: Array.isArray(prev.variants) ? prev.variants.slice() : [] };
    }
  }else{
    state.prompts.unshift(normalizePromptRecord({
      id: uid(),
      title,
      tags,
      body,
      createdAt: ts,
      updatedAt: ts,
      revisions: [{ id: uid(), title, tags, body, createdAt: ts }],
      variants: []
    }));
  }
  savePrompts();
  closeModal();
  renderAll();
}

function saveVariant(){
  if(!state.editingId){
    const fe = $("formErr");
    if(fe) fe.textContent = "Save this prompt first, then branch variants from it.";
    return;
  }
  const i = state.prompts.findIndex(p=>p.id===state.editingId);
  if(i < 0) return;
  const labelInput = window.prompt("Variant label:", $("fTitle").value.trim() || "Variant");
  if(labelInput === null) return;
  const label = labelInput.trim() || "Variant";
  const title = ($("fTitle").value || "").trim() || "(untitled)";
  const tags = normTags($("fTags").value);
  const body = ($("fBody").value || "").trim();
  if(!body){
    const fe = $("formErr");
    if(fe) fe.textContent = "Give the draft a body before saving a variant.";
    return;
  }
  const prompt = normalizePromptRecord(state.prompts[i]);
  const ts = nowISO();
  const variants = Array.isArray(prompt.variants) ? prompt.variants.slice() : [];
  variants.unshift(normalizeVariant({ label, title, tags, body, createdAt: ts }, { title, tags, body, updatedAt: ts, createdAt: prompt.createdAt }));
  state.prompts[i] = { ...prompt, updatedAt: ts, variants };
  savePrompts();
  const saved = normalizePromptRecord(state.prompts[i]);
  renderVariants(saved);
  renderComparePanel(saved);
  renderAll();
  const fe = $("formErr");
  if(fe) fe.textContent = `Saved "${label}" as a reusable variant.`;
}

function deletePrompt(){
  if(!state.editingId) return;
  const id = state.editingId;
  state.prompts = state.prompts.filter(p=>p.id!==id);
  savePrompts();
  closeModal();
  renderAll();
}

function exportPrompts(){
  const blob = new Blob([JSON.stringify(state.prompts, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `prompt-vault-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 500);
}

async function importPrompts(file){
  const txt = await file.text();
  let data;
  try{
    data = JSON.parse(txt);
  }catch{
    alert("That file is not valid JSON.");
    return;
  }
  if(!Array.isArray(data)){
    alert("JSON must be an array of prompts.");
    return;
  }

  // normalize + merge by id if present
  const incoming = data
    .filter(Boolean)
    .map(p=>normalizePromptRecord({
      ...p,
      updatedAt: p.updatedAt || nowISO(),
    }));

  const map = new Map(state.prompts.map(p=>[p.id,p]));
  incoming.forEach(p=> map.set(p.id, p));
  state.prompts = normalizePromptCollection(Array.from(map.values()));
  savePrompts();
  renderAll();
}

function renderRevisionHistory(item){
  const meta = $("revisionMeta");
  const list = $("revisionList");
  if(!meta || !list) return;
  if(!item){
    meta.textContent = "No revisions yet";
    list.innerHTML = `<div class="pvRevisionEmpty">Save this prompt once and its revision history starts here.</div>`;
    return;
  }
  const prompt = normalizePromptRecord(item);
  const revisions = prompt.revisions || [];
  meta.textContent = `${revisions.length} version${revisions.length === 1 ? "" : "s"}`;
  if(!revisions.length){
    list.innerHTML = `<div class="pvRevisionEmpty">No saved revisions.</div>`;
    return;
  }
  list.innerHTML = "";
  revisions.slice(0, 8).forEach((rev, idx)=>{
    const row = document.createElement("div");
    row.className = "pvRevisionItem";
    row.innerHTML = `
      <div class="pvRevisionMain">
        <div class="pvRevisionStamp">v${revisions.length - idx} · ${formatDate(rev.createdAt)}</div>
        <div class="pvRevisionText">${clamp(rev.body, 180)}</div>
      </div>
      <button class="pvIconBtn" type="button" title="Restore this version">↺</button>
    `;
    row.querySelector("button").addEventListener("click", ()=>{
      $("fTitle").value = rev.title || "";
      $("fTags").value = (rev.tags || []).join(", ");
      $("fBody").value = rev.body || "";
      const fe = $("formErr");
      if(fe) fe.textContent = "Loaded revision into the editor. Save to create a new head version.";
      renderComparePanel(normalizePromptRecord(item));
    });
    list.appendChild(row);
  });
}

function renderVariants(item){
  const meta = $("variantMeta");
  const list = $("variantList");
  const saveBtn = $("btnSaveVariant");
  if(!meta || !list || !saveBtn) return;
  if(!item){
    meta.textContent = "Save the prompt first to branch variants.";
    list.innerHTML = `<div class="pvRevisionEmpty">Variants hang off an existing prompt record, so the first save creates the base entry.</div>`;
    saveBtn.disabled = true;
    return;
  }
  saveBtn.disabled = false;
  const prompt = normalizePromptRecord(item);
  const variants = prompt.variants || [];
  meta.textContent = `${variants.length} variant${variants.length === 1 ? "" : "s"}`;
  if(!variants.length){
    list.innerHTML = `<div class="pvRevisionEmpty">No variants yet. Save the current draft as an alternate approach when you want to preserve the main head prompt.</div>`;
    return;
  }
  list.innerHTML = "";
  variants.forEach((variant)=>{
    const row = document.createElement("div");
    row.className = "pvVariantItem";
    row.innerHTML = `
      <div class="pvVariantMain">
        <div class="pvVariantStamp">${formatDate(variant.createdAt)}</div>
        <div class="pvVariantName">${escapeHtml(variant.label || variant.title || "Variant")}</div>
        <div class="pvVariantText">${escapeHtml(clamp(variant.body, 180))}</div>
        <div class="pvVariantTags">${(variant.tags || []).slice(0, 8).map(t=>`<span class="pvTag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
      <div class="pvVariantButtons">
        <button class="pvIconBtn" type="button" title="Load variant into editor">↺</button>
        <button class="pvIconBtn" type="button" title="Compare against head">⇄</button>
      </div>
    `;
    const [restoreBtn, compareBtn] = row.querySelectorAll("button");
    restoreBtn.addEventListener("click", ()=>{
      $("fTitle").value = variant.title || "";
      $("fTags").value = (variant.tags || []).join(", ");
      $("fBody").value = variant.body || "";
      const fe = $("formErr");
      if(fe) fe.textContent = `Loaded variant "${variant.label || variant.title || "Variant"}" into the editor. Save to promote it to the head prompt.`;
      renderComparePanel(prompt);
    });
    compareBtn.addEventListener("click", ()=>{
      state.compareLeft = "head";
      state.compareRight = `variant:${variant.id}`;
      renderComparePanel(prompt);
    });
    list.appendChild(row);
  });
}

function getDraftSnapshot(){
  return {
    id: "draft",
    type: "draft",
    label: "Current draft",
    title: ($("fTitle")?.value || "").trim() || "(untitled)",
    tags: normTags($("fTags")?.value || ""),
    body: ($("fBody")?.value || "").trim(),
    createdAt: nowISO()
  };
}

function getCompareOptions(prompt){
  if(!prompt){
    return [
      { value: "draft", label: "Current draft" }
    ];
  }
  const options = [
    { value: "head", label: "Head prompt" },
    { value: "draft", label: "Current draft" }
  ];
  (prompt.variants || []).forEach((variant, idx)=>{
    options.push({ value: `variant:${variant.id}`, label: `Variant ${idx + 1}: ${variant.label || variant.title}` });
  });
  (prompt.revisions || []).slice(0, 6).forEach((rev, idx, arr)=>{
    options.push({ value: `revision:${rev.id}`, label: `Revision v${arr.length - idx}: ${formatDate(rev.createdAt)}` });
  });
  return options;
}

function resolveCompareItem(prompt, key){
  if(key === "draft") return getDraftSnapshot();
  if(key === "head" && prompt){
    return {
      id: prompt.id,
      type: "head",
      label: "Head prompt",
      title: prompt.title,
      tags: prompt.tags || [],
      body: prompt.body || "",
      createdAt: prompt.updatedAt || prompt.createdAt
    };
  }
  if(prompt && key.startsWith("variant:")){
    const variant = (prompt.variants || []).find(v=>`variant:${v.id}` === key);
    if(variant) return { ...variant, type: "variant", label: variant.label || variant.title || "Variant" };
  }
  if(prompt && key.startsWith("revision:")){
    const revision = (prompt.revisions || []).find(v=>`revision:${v.id}` === key);
    if(revision) return { ...revision, type: "revision", label: `Revision · ${formatDate(revision.createdAt)}` };
  }
  return null;
}

function joinTags(tags){
  return (Array.isArray(tags) ? tags : []).join(", ") || "No tags";
}

function summarizeComparison(left, right){
  if(!left || !right) return "Pick two saved surfaces to compare.";
  const changes = [];
  if((left.title || "") !== (right.title || "")) changes.push("title changed");
  if(joinTags(left.tags) !== joinTags(right.tags)) changes.push("tags changed");
  const leftBody = left.body || "";
  const rightBody = right.body || "";
  const wordDelta = Math.abs(leftBody.split(/\s+/).filter(Boolean).length - rightBody.split(/\s+/).filter(Boolean).length);
  if(leftBody !== rightBody) changes.push(`body differs by about ${wordDelta} word${wordDelta === 1 ? "" : "s"}`);
  if(!changes.length) return "These two versions currently match on title, tags, and body.";
  return changes.join(" · ");
}

function renderCompareContent(item){
  if(!item){
    return `<div class="pvCompareEmpty">Nothing selected.</div>`;
  }
  return `
    <div class="pvCompareBlock">
      <div class="pvCompareLabel">Source</div>
      <div class="pvCompareValue">${escapeHtml(item.label || item.title || item.type || "Version")}</div>
    </div>
    <div class="pvCompareBlock">
      <div class="pvCompareLabel">Title</div>
      <div class="pvCompareValue">${escapeHtml(item.title || "(untitled)")}</div>
    </div>
    <div class="pvCompareBlock">
      <div class="pvCompareLabel">Tags</div>
      <div class="pvCompareValue">${escapeHtml(joinTags(item.tags))}</div>
    </div>
    <div class="pvCompareBlock">
      <div class="pvCompareLabel">Body</div>
      <div class="pvCompareValue">${escapeHtml(item.body || "(empty)")}</div>
    </div>
  `;
}

function renderComparePanel(item){
  const leftSel = $("compareLeft");
  const rightSel = $("compareRight");
  const leftSlot = $("compareLeftSlot");
  const rightSlot = $("compareRightSlot");
  const meta = $("compareMeta");
  if(!leftSel || !rightSel || !leftSlot || !rightSlot || !meta) return;
  const prompt = item ? normalizePromptRecord(item) : null;
  const options = getCompareOptions(prompt);
  const ensureKey = (candidate, fallback) => options.some(opt=>opt.value === candidate) ? candidate : fallback;
  state.compareLeft = ensureKey(state.compareLeft, options[0]?.value || "draft");
  state.compareRight = ensureKey(state.compareRight, options.find(opt=>opt.value !== state.compareLeft)?.value || state.compareLeft);
  leftSel.innerHTML = options.map(opt=>`<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join("");
  rightSel.innerHTML = options.map(opt=>`<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join("");
  leftSel.value = state.compareLeft;
  rightSel.value = state.compareRight;
  const left = resolveCompareItem(prompt, state.compareLeft);
  const right = resolveCompareItem(prompt, state.compareRight);
  leftSlot.innerHTML = renderCompareContent(left);
  rightSlot.innerHTML = renderCompareContent(right);
  meta.textContent = summarizeComparison(left, right);
}

function getAllTags(){
  const set = new Set();
  state.prompts.forEach(p => (p.tags||[]).forEach(t=>set.add(t)));
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function matches(p){
  const q = state.q.trim().toLowerCase();
  const tagOk = state.selectedTags.size === 0 || (p.tags||[]).some(t=>state.selectedTags.has(t));
  if(!tagOk) return false;
  if(!q) return true;
  const hay = `${p.title||""} ${(p.tags||[]).join(" ")} ${p.body||""}`.toLowerCase();
  return hay.includes(q);
}

function renderTags(){
  const root = $("tagChips");
  root.innerHTML = "";
  const tags = getAllTags();
  if(tags.length === 0){
    root.innerHTML = `<div class="pvEmpty">No tags yet. Add tags when you save a prompt.</div>`;
    return;
  }

  tags.forEach(t=>{
    const b = document.createElement("button");
    b.type="button";
    b.className = "pvChip" + (state.selectedTags.has(t) ? " pvChipOn" : "");
    b.textContent = t;
    b.addEventListener("click", ()=>{
      if(state.selectedTags.has(t)) state.selectedTags.delete(t);
      else state.selectedTags.add(t);
      renderAll();
    });
    root.appendChild(b);
  });
}

function renderList(){
  const root = $("list");
  const items = state.prompts.filter(matches);
  $("meta").textContent = `${items.length} shown / ${state.prompts.length} total`;

  if(items.length === 0){
    root.innerHTML = `
      <div class="pvEmpty">
        <div style="font-weight:800; font-size:16px; margin-bottom:6px;">Nothing here (yet).</div>
        <div>Hit <b>New prompt</b>, paste something powerful, and lock it down.</div>
        <div style="margin-top:8px; opacity:.75;">(Or adjust your search/filters. The vault obeys.)</div>
      </div>`;
    return;
  }

  root.innerHTML = "";
  items.forEach(p=>{
    const row = document.createElement("div");
    row.className="pvItem";

    const main = document.createElement("div");
    main.style.flex="1";

    const title = document.createElement("div");
    title.className="pvItemTitle";
    title.textContent = p.title || "(untitled)";

    const body = document.createElement("div");
    body.className="pvItemBody";
    body.textContent = p.body || "";

    const tags = document.createElement("div");
    tags.className="pvItemTags";
    (p.tags||[]).slice(0,8).forEach(t=>{
      const chip = document.createElement("span");
      chip.className="pvTag";
      chip.textContent = t;
      tags.appendChild(chip);
    });

    const meta = document.createElement("div");
    meta.className="pvItemMeta";
    const revCount = Array.isArray(p.revisions) ? p.revisions.length : 1;
    const variantCount = Array.isArray(p.variants) ? p.variants.length : 0;
    meta.textContent = `Updated ${formatDate(p.updatedAt || p.createdAt)} · ${revCount} version${revCount === 1 ? "" : "s"} · ${variantCount} variant${variantCount === 1 ? "" : "s"}`;

    main.appendChild(title);
    main.appendChild(body);
    if((p.tags||[]).length) main.appendChild(tags);
    main.appendChild(meta);

    const acts = document.createElement("div");
    acts.className="pvItemActions";

    const btnEdit = document.createElement("button");
    btnEdit.type="button";
    btnEdit.className="pvIconBtn";
    btnEdit.textContent = "✎";
    btnEdit.title = "Edit";
    btnEdit.addEventListener("click", ()=>openModal(p.id));

    const btnCopy = document.createElement("button");
    btnCopy.type="button";
    btnCopy.className="pvIconBtn";
    btnCopy.textContent = "⧉";
    btnCopy.title = "Copy prompt";
    btnCopy.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(p.body || "");
        $("meta").textContent = "Copied to clipboard.";
        setTimeout(()=>renderAll(), 650);
      }catch{
        alert("Clipboard blocked by browser.");
      }
    });

    acts.appendChild(btnEdit);
    acts.appendChild(btnCopy);

    row.appendChild(main);
    row.appendChild(acts);
    root.appendChild(row);

    // click main area to edit
    row.addEventListener("dblclick", ()=>openModal(p.id));
  });
}

function renderAll(){
  renderTags();
  renderList();
  showStorageWarningBannerIfNeeded();
}

function changePasscode(){
  const current = prompt("Enter current passcode:", "");
  if(current === null) return;
  if(current !== getPass()){
    alert("Wrong current passcode.");
    return;
  }
  const next = prompt("Enter new 4-digit passcode:", "");
  if(next === null) return;
  if(!/^\d{4}$/.test(next)){
    alert("Passcode must be exactly 4 digits.");
    return;
  }
  setPass(next);
  alert("Passcode updated.");
}

function lockNow(){
  setLocked(true);
}

function init(){
  ensurePassInitialized();
  // Load data
  state.prompts = loadPrompts();

  // Backend hydrate (only if local is empty)
  (async ()=>{
    try{
      if(state.prompts && state.prompts.length) return;
      const remote = await window.NexusAppData?.loadLatest?.("prompt-vault");
      const arr = remote?.payload?.prompts;
      if(Array.isArray(arr) && arr.length){
        state.prompts = normalizePromptCollection(arr);
        savePrompts();
        renderAll();
      }
    }catch(_e){}
  })();


  // Wire UI
  $("q").addEventListener("input", (e)=>{
    state.q = e.target.value || "";
    renderList();
  });

  $("btnNew").addEventListener("click", ()=>openModal(null));
  $("btnClose").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e)=>{ if(e.target === $("modal")) closeModal(); });

  $("btnSave").addEventListener("click", () => {
    try {
      console.log("[PromptVault] Save clicked", { editingId: state.editingId, locked: state.locked });
      upsertPrompt();
    } catch (e) {
      console.error("[PromptVault] Save failed", e);
      alert("Save failed: " + (e?.message || e));
    }
  });
  $("btnSaveVariant").addEventListener("click", saveVariant);
  $("btnDelete").addEventListener("click", ()=>{
    if(confirm("Delete this prompt?")) deletePrompt();
  });
  ["fTitle", "fTags", "fBody"].forEach((id)=>{
    $(id).addEventListener("input", ()=>{
      if(state.editingId){
        const prompt = state.prompts.find(p=>p.id === state.editingId) || null;
        renderComparePanel(prompt);
      }else{
        renderComparePanel(null);
      }
    });
  });
  $("compareLeft").addEventListener("change", (e)=>{
    state.compareLeft = e.target.value;
    const prompt = state.editingId ? state.prompts.find(p=>p.id === state.editingId) : null;
    renderComparePanel(prompt || null);
  });
  $("compareRight").addEventListener("change", (e)=>{
    state.compareRight = e.target.value;
    const prompt = state.editingId ? state.prompts.find(p=>p.id === state.editingId) : null;
    renderComparePanel(prompt || null);
  });

  $("btnExport").addEventListener("click", exportPrompts);
  $("fileImport").addEventListener("change", async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(f) await importPrompts(f);
    e.target.value = "";
  });

  $("btnChangePass").addEventListener("click", changePasscode);
  $("btnLock").addEventListener("click", lockNow);
  $("btnClearPin").addEventListener("click", pinClear);
  $("btnResetPass").addEventListener("click", ()=>{
    if(confirm("Reset the local passcode back to 1234 for this browser?")){
      setPass(DEFAULT_PASS);
      pinClear();
      $("lockErr").textContent = "Passcode reset. Use 1234.";
      setLocked(true);
    }
  });
  $("btnUseKeyboard").addEventListener("click", ()=> $("lockErr").textContent = "Keyboard input is enabled. Type 4 digits.");


  // Keypad + lock
  buildKeypad();
  setLocked(true);

  renderAll();
}

init();
