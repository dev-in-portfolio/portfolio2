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
