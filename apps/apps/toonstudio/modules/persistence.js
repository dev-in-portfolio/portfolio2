  function loadProject() {
    try {
      const raw = localStorage.getItem(LS.project);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveProject() {
    try {
      localStorage.setItem(LS.project, JSON.stringify(state.project));
    scheduleServerSync();
      scheduleServerSync();
    } catch {}
  }

// ------------------------- Backend Sync (optional) -------------------------
// Uses Netlify Functions via /api/* redirect. Silent fallback if offline/unconfigured.
const SERVER = { saveUrl: "/api/toon-project-save" };
let _syncTimer = null;

function buildServerPayload() {
  return { kind: "toonstudio_project_v1", ts: Date.now(), project: state.project };
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
    const res = await fetch(`${SERVER.saveUrl}?client_id=${encodeURIComponent(clientId)}&limit=1`, { method: "GET" });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const p = data?.items?.[0]?.payload;
    if (!p || typeof p !== "object") return;
    if (p.project && typeof p.project === "object") {
      state.project = p.project;
      saveProject();
      render();
    }
  } catch (_) {}
}

  function setError(msg) {
    state.error = msg || "";
    render();
    if (msg) setTimeout(() => { state.error = ""; render(); }, 6000);
  }

  function canAdvanceTo(step) {
    const cur = STEPS.indexOf(state.step);
    const nxt = STEPS.indexOf(step);
    return nxt <= cur;
  }

