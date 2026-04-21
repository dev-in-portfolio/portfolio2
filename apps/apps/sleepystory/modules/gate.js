// ------------------------- Backend Sync (optional) -------------------------
// Uses Netlify Functions via /api/* redirect. Silent fallback if offline/unconfigured.
const SERVER = { saveUrl: "/api/sleepystory-save" };
let _syncTimer = null;

function buildServerPayload() {
  let bookmark = null;
  try { bookmark = JSON.parse(localStorage.getItem(LS_BOOKMARK) || "null"); } catch (_) {}
  return {
    kind: "sleepystory_state_v1",
    ts: Date.now(),
    lastTopic: localStorage.getItem(LS_LAST_TOPIC) || "",
    bookmark,
    currentStory,
    currentPage,
  };
}

async function serverSaveNow() {
  const clientId = (localStorage.getItem(LS_KEY) || "").trim();
  if (!clientId) return;
  try {
    await fetch(SERVER.saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, payload: buildServerPayload() }),
    });
  } catch (_) {}
}

function scheduleServerSync() {
  const clientId = (localStorage.getItem(LS_KEY) || "").trim();
  if (!clientId) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => { serverSaveNow(); }, 900);
}

async function serverLoadLatest() {
  const clientId = (localStorage.getItem(LS_KEY) || "").trim();
  if (!clientId) return;
  try {
    const res = await fetch(`${SERVER.saveUrl}?client_id=${encodeURIComponent(clientId)}&limit=1`, { method: "GET" });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const p = data?.items?.[0]?.payload;
    if (!p || typeof p !== "object") return;

    if (typeof p.lastTopic === "string") localStorage.setItem(LS_LAST_TOPIC, p.lastTopic);
    if (p.bookmark) localStorage.setItem(LS_BOOKMARK, JSON.stringify(p.bookmark));

    if (p.currentStory && typeof p.currentStory === "object") {
      currentStory = normalizeStory(p.currentStory);
      currentPage = Math.max(0, Math.min(Number(p.currentPage)||0, (currentStory.pages||[]).length-1));
    }

    loadBookmarkFromStorage();
    serverLoadLatest();
  } catch (_) {}
}


  // aistudio compatibility shim expected by original app
  window.aistudio = window.aistudio || {};
  window.aistudio.hasSelectedApiKey = async () => {
    const k = (localStorage.getItem(LS_KEY) || "").trim();
    return !!k;
  };

  function maskKey(k) {
    if (!k) return "";
    const t = k.trim();
    if (t.length <= 8) return "•".repeat(t.length);
    return "•".repeat(t.length - 4) + t.slice(-4);
  }

  function el(sel) { return document.querySelector(sel); }
  function els(sel) { return Array.from(document.querySelectorAll(sel)); }

  function openKeyModal() {
    const modal = el("#keyModal");
    if (!modal) return;
    const input = el("#apiKeyInput");
    const saved = (localStorage.getItem(LS_KEY) || "").trim();
    input.value = saved;
    el("#apiKeySaved").textContent = saved ? `Saved: ${maskKey(saved)}` : "No key saved yet.";
    modal.classList.remove("hidden");
    input.focus();
  }

  function closeKeyModal() {
    const modal = el("#keyModal");
