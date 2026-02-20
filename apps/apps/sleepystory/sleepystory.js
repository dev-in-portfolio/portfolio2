
/* SleepyStory Studio — vanilla static runtime (no build step). */
/* No build stamps. */

(function () {
  const LS_KEY = "sleepystory_api_key";
  const LS_BOOKMARK = "sleepystory_bookmark";
  const LS_LAST_TOPIC = "sleepystory_last_topic";

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
    if (!modal) return;
    modal.classList.add("hidden");
  }

  window.aistudio.openSelectKey = async () => {
    openKeyModal();
  };

  async function ensureKeyOrGate() {
    const has = await window.aistudio.hasSelectedApiKey();
    if (!has) {
      renderGate();
      return false;
    }
    return true;
  }

  function renderGate() {
    // Keep visuals consistent with TSX "Access required" screen.
    el("#app").innerHTML = `
      <div class="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div class="bg-[color:var(--panel)] rounded-[2rem] p-16 max-w-2xl w-full text-center shadow-2xl space-y-10 border border-white/10 paper-texture">
          <div class="text-[140px] animate-studio-pulse select-none">🪄</div>
          <h1 class="text-5xl font-magic text-[color:var(--text)]">Access required</h1>
          <p class="text-2xl text-slate-500 font-medium italic">Please connect your key to continue.</p>
          <button id="connectKeyBtn" class="w-full bg-indigo-600 text-white font-magic text-4xl py-10 rounded-[3rem] shadow-xl transition-all active:scale-95 border-b-[12px] border-indigo-800 studio-btn">
            Connect Key
          </button>
          <p class="text-sm text-[color:var(--muted)]">Sleepy Story requires a valid Gemini API key.</p>
        </div>
      </div>
    `;
    const btn = el("#connectKeyBtn");
    if (btn) btn.addEventListener("click", () => openKeyModal());
  }

  function parseJSONSafe(txt) {
    try { return JSON.parse(txt); } catch { return null; }
  }

  async function geminiGenerateStory(topic) {
    const apiKey = (localStorage.getItem(LS_KEY) || "").trim();
    if (!apiKey) throw new Error("NO_KEY");

    const prompt = `Create a professional SleepyStory Studio adventure (5-8 pages) for children about: "${topic}". 
Requirements:
- Heartwarming, imaginative, and calming tone (perfect for bedtime).
- 2-3 unique characters with emojis and bios.
- 2 interactive coordinates (x,y 10-90) per page with fun secrets.
- High narrative quality.
Return as valid JSON only.`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(apiKey);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2500 }
      })
    });

    if (!res.ok) {
      // keep UI backend-present; don't leak CORS/dev talk.
      throw new Error("SERVICE_UNAVAILABLE");
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    const parsed = parseJSONSafe(text) || parseJSONSafe(text.replace(/```json|```/g,"").trim());
    if (!parsed) throw new Error("BAD_JSON");
    return parsed;
  }

  function normalizeStory(raw) {
    // Make a minimal compatible shape.
    const title = raw.title || "Sleepy Story";
    const pages = Array.isArray(raw.pages) ? raw.pages : (Array.isArray(raw.storyPages) ? raw.storyPages : []);
    const characters = Array.isArray(raw.characters) ? raw.characters : [];
    return { title, pages, characters };
  }

  function renderStudio() {
    const lastTopic = localStorage.getItem(LS_LAST_TOPIC) || "";
    el("#app").innerHTML = `
      <div class="min-h-screen pb-20">
        <header class="bg-[color:var(--panel)]/85 backdrop-blur-xl sticky top-0 z-40 p-6 flex flex-wrap justify-between items-center shadow-2xl border-b border-white/10 ui">
          <div class="flex items-center gap-5 cursor-pointer group">
            <div class="text-4xl">🌙</div>
            <div>
              <div class="font-magic text-3xl text-[color:var(--text)] leading-tight">SleepyStory Studio</div>
              <div class="text-sm text-[color:var(--muted)] -mt-1">Connected • Ready • Synced</div>
            </div>
          </div>
          <div class="flex gap-3 items-center">
            <button id="setupBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-[color:var(--text)] rounded-2xl px-5 py-3 font-semibold transition-all">Setup</button>
            <button id="exportBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-[color:var(--text)] rounded-2xl px-5 py-3 font-semibold transition-all">Export</button>
            <button id="importBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-[color:var(--text)] rounded-2xl px-5 py-3 font-semibold transition-all">Import</button>
          </div>
        </header>

        <main class="max-w-6xl mx-auto px-6 pt-10 space-y-10">
          <section class="bg-white rounded-[2.25rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div class="p-10 md:p-14">
              <h2 class="font-magic text-5xl text-slate-900 leading-tight">Make a bedtime adventure</h2>
              <p class="text-slate-600 mt-4 text-lg">Pick a cozy idea. I’ll weave it into a calm, page‑turning story.</p>

              <div class="mt-8 grid md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label class="text-sm font-bold text-slate-600">Topic</label>
                  <input id="topicInput" class="mt-2 w-full text-xl px-6 py-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100" placeholder="e.g., a sleepy dragon who learns to yawn" value="${escapeHtml(lastTopic)}" />
                  <div class="mt-3 text-sm text-slate-400 italic">Your key is stored on this device. Export to keep it safe.</div>
                </div>
                <button id="startBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-magic text-3xl px-10 py-6 rounded-[2rem] shadow-xl transition-all active:scale-95 border-b-[10px] border-indigo-800">
                  Start Magic ✨
                </button>
              </div>

              <div id="status" class="mt-6 text-slate-600"></div>
              <div id="error" class="mt-4 text-red-600 font-semibold"></div>
            </div>
          </section>

          <section id="storySection" class="hidden">
            <div class="bg-white rounded-[2.25rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div class="p-10 md:p-14">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div class="font-magic text-4xl text-slate-900" id="storyTitle"></div>
                    <div class="text-slate-500 mt-1" id="storyMeta"></div>
                  </div>
                  <div class="flex gap-3 items-center">
                    <button id="bookmarkBtn" class="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 font-semibold">Bookmark</button>
                    <button id="newStoryBtn" class="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 font-semibold">New Story</button>
                  </div>
                </div>

                <div class="mt-8 bg-[var(--book-bg)] rounded-[2rem] p-8 shadow-inner border border-slate-100">
                  <div class="flex items-center justify-between">
                    <button id="prevBtn" class="bg-white/70 hover:bg-white border border-slate-200 rounded-2xl px-5 py-3 font-semibold">← Prev</button>
                    <div class="text-slate-500 font-semibold" id="pageCounter"></div>
                    <button id="nextBtn" class="bg-white/70 hover:bg-white border border-slate-200 rounded-2xl px-5 py-3 font-semibold">Next →</button>
                  </div>
                  <div class="mt-8">
                    <div class="font-magic text-3xl text-slate-900" id="pageTitle"></div>
                    <div class="mt-4 text-slate-700 text-xl leading-relaxed whitespace-pre-wrap" id="pageText"></div>
                  </div>
                </div>

              </div>
            </div>
          </section>

        </main>
      </div>
    `;

    el("#setupBtn").addEventListener("click", openKeyModal);
    el("#startBtn").addEventListener("click", onStart);
    el("#newStoryBtn").addEventListener("click", () => {
      el("#storySection").classList.add("hidden");
      el("#error").textContent = "";
      el("#status").textContent = "";
      el("#topicInput").focus();
    });
    el("#bookmarkBtn").addEventListener("click", saveBookmark);
    el("#exportBtn").addEventListener("click", exportData);
    el("#importBtn").addEventListener("click", importData);

    // if bookmark exists, show "resume" hint
    const bm = getBookmark();
    if (bm) {
      el("#status").innerHTML = `<span class="font-semibold">Bookmark found:</span> “${escapeHtml(bm.storyTitle || "Story")}” (page ${bm.pageIndex + 1}). You can start a new story or import/export.`;
    }
  }

  let currentStory = null;
  let currentPage = 0;

  async function onStart() {
    const input = el("#topicInput");
    const topic = (input.value || "").trim();
    localStorage.setItem(LS_LAST_TOPIC, topic);
    scheduleServerSync();
    if (!topic) {
      el("#error").textContent = "Give me a topic first.";
      return;
    }
    el("#error").textContent = "";
    el("#status").textContent = "Starting…";
    const startBtn = el("#startBtn");
    startBtn.disabled = true;
    startBtn.classList.add("opacity-60");

    try {
      const raw = await geminiGenerateStory(topic);
      currentStory = normalizeStory(raw);
      currentPage = 0;
      renderStory();
      el("#status").textContent = "Ready.";
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      if (msg === "NO_KEY") {
        renderGate();
        openKeyModal();
      } else if (msg === "SERVICE_UNAVAILABLE") {
        el("#error").textContent = "The story service is temporarily unavailable. Please try again.";
      } else {
        el("#error").textContent = "We couldn't start a story right now. Please try again in a moment.";
      }
      el("#status").textContent = "";
    } finally {
      startBtn.disabled = false;
      startBtn.classList.remove("opacity-60");
    }
  }

  function renderStory() {
    el("#storySection").classList.remove("hidden");
    el("#storyTitle").textContent = currentStory.title || "Sleepy Story";
    const chars = (currentStory.characters || []).map(c => c?.emoji ? `${c.emoji} ${c.name||""}` : (c?.name||"")).filter(Boolean);
    el("#storyMeta").textContent = chars.length ? `Characters: ${chars.join(" • ")}` : "A calm, cozy adventure.";
    updatePage();
    el("#prevBtn").addEventListener("click", () => { if (currentPage>0) { currentPage--; updatePage(); }});
    el("#nextBtn").addEventListener("click", () => { if (currentPage<currentStory.pages.length-1) { currentPage++; updatePage(); }});
  }

  function updatePage() {
    const pages = currentStory.pages || [];
    const p = pages[currentPage] || {};
    el("#pageCounter").textContent = `Page ${currentPage + 1} / ${Math.max(1,pages.length)}`;
    el("#pageTitle").textContent = p.title || p.heading || "…";
    el("#pageText").textContent = p.text || p.content || p.body || "";
    el("#prevBtn").disabled = currentPage === 0;
    el("#nextBtn").disabled = currentPage >= pages.length - 1;
    el("#prevBtn").classList.toggle("opacity-50", el("#prevBtn").disabled);
    el("#nextBtn").classList.toggle("opacity-50", el("#nextBtn").disabled);
  }

  function getBookmark() {
    const saved = localStorage.getItem(LS_BOOKMARK);
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  }

  function saveBookmark() {
    if (!currentStory) return;
    const bm = { storyTitle: currentStory.title, pageIndex: currentPage, savedAt: Date.now() };
    localStorage.setItem(LS_BOOKMARK, JSON.stringify(bm));
    scheduleServerSync();
    el("#status").textContent = `Bookmarked page ${currentPage + 1}.`;
  }

  function exportData() {
    const payload = {
      apiKey: (localStorage.getItem(LS_KEY) || "").trim(),
      bookmark: getBookmark(),
      lastTopic: localStorage.getItem(LS_LAST_TOPIC) || "",
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sleepystory-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || "{}"));
          if (typeof data.apiKey === "string") localStorage.setItem(LS_KEY, data.apiKey);
          if (data.bookmark) localStorage.setItem(LS_BOOKMARK, JSON.stringify(data.bookmark));
          if (typeof data.lastTopic === "string") localStorage.setItem(LS_LAST_TOPIC, data.lastTopic);
          el("#status").textContent = "Imported. Ready.";
        } catch {
          el("#error").textContent = "Import failed (bad file).";
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function wireKeyModal() {
    const modal = el("#keyModal");
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeKeyModal();
    });
    el("#keyCancel").addEventListener("click", closeKeyModal);
    el("#keySave").addEventListener("click", () => {
      const v = (el("#apiKeyInput").value || "").trim();
      if (v) localStorage.setItem(LS_KEY, v);
      else localStorage.removeItem(LS_KEY);
      el("#apiKeySaved").textContent = v ? `Saved: ${maskKey(v)}` : "No key saved yet.";
      closeKeyModal();
      // re-render studio if we were gated
      ensureKeyOrGate().then((ok) => { if (ok) renderStudio(); });
    });
  }

  async function boot() {
    wireKeyModal();
    const ok = await ensureKeyOrGate();
    if (ok) renderStudio();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
