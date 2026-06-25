/* SleepyStory Studio — Cosmic Dreamscape Edition */

(function () {
  const LS_KEY = "sleepystory_api_key";
  const LS_BOOKMARK = "sleepystory_bookmark";
  const LS_LAST_TOPIC = "sleepystory_last_topic";

  const SERVER = { saveUrl: "/api/sleepystory-save" };
  let _syncTimer = null;

  // ------------------------- Audio loops (Ambient Soundscapes) -------------------------
  const audioRain = new Audio("https://archive.org/download/ambient-rain-loop/ambient-rain-loop.mp3");
  const audioWind = new Audio("https://archive.org/download/ambient-wind-loop/ambient-wind-loop.mp3");
  const audioWaves = new Audio("https://archive.org/download/ambient-ocean-waves-loop/ambient-ocean-waves-loop.mp3");

  audioRain.loop = true;
  audioWind.loop = true;
  audioWaves.loop = true;

  audioRain.crossOrigin = "anonymous";
  audioWind.crossOrigin = "anonymous";
  audioWaves.crossOrigin = "anonymous";

  // ------------------------- Backend Sync -------------------------
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
        currentPage = Math.max(0, Math.min(Number(p.currentPage) || 0, (currentStory.pages || []).length - 1));
      }

      loadBookmarkFromStorage();
    } catch (_) {}
  }

  // AI Studio compatibility shim
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
    el("#app").innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-8 relative">
        <div class="glass-panel rounded-[2.5rem] p-12 max-w-xl w-full text-center space-y-8 paper-texture">
          <div class="text-[100px] animate-studio-pulse select-none">🪄</div>
          <h1 class="text-4xl font-magic text-[color:var(--text)]">Access Required</h1>
          <p class="text-lg text-slate-400 font-medium italic">Please connect your key to continue.</p>
          <button id="connectKeyBtn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-magic text-2xl py-6 rounded-[2rem] shadow-xl transition-all active:scale-95 border-b-[8px] border-indigo-800 studio-btn">
            Connect Key
          </button>
          <p class="text-xs text-[color:var(--muted)] font-semibold">Sleepy Story requires a valid Gemini API key to generate bedtime stories.</p>
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
- High narrative quality.
Return as valid JSON only. Format: { "title": "...", "characters": [{"name":"...", "emoji":"...", "bio":"..."}], "pages": [{"title": "...", "text": "..."}] }`;

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
      throw new Error("SERVICE_UNAVAILABLE");
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    const cleanText = text.replace(/```json|```/g, "").trim();
    const parsed = parseJSONSafe(cleanText) || parseJSONSafe(text);
    if (!parsed) throw new Error("BAD_JSON");
    return parsed;
  }

  function normalizeStory(raw) {
    const title = raw.title || "Sleepy Story";
    const pages = Array.isArray(raw.pages) ? raw.pages : (Array.isArray(raw.storyPages) ? raw.storyPages : []);
    const characters = Array.isArray(raw.characters) ? raw.characters : [];
    return { title, pages, characters };
  }

  function wireAudioControls() {
    const rainBtn = el("#soundRainPlay");
    const rainVol = el("#soundRainVolume");
    const windBtn = el("#soundWindPlay");
    const windVol = el("#soundWindVolume");
    const wavesBtn = el("#soundWavesPlay");
    const wavesVol = el("#soundWavesVolume");

    function setupAudioToggle(audio, btn, slider) {
      btn.addEventListener("click", () => {
        if (audio.paused) {
          audio.volume = Number(slider.value) || 0.5;
          if (audio.volume === 0) {
            audio.volume = 0.5;
            slider.value = 0.5;
          }
          audio.play().catch(() => {});
          btn.classList.add("text-indigo-400");
        } else {
          audio.pause();
          btn.classList.remove("text-indigo-400");
        }
      });

      slider.addEventListener("input", () => {
        const val = Number(slider.value);
        audio.volume = val;
        if (val > 0 && audio.paused) {
          audio.play().catch(() => {});
          btn.classList.add("text-indigo-400");
        } else if (val === 0 && !audio.paused) {
          audio.pause();
          btn.classList.remove("text-indigo-400");
        }
      });
    }

    if (rainBtn && rainVol) setupAudioToggle(audioRain, rainBtn, rainVol);
    if (windBtn && windVol) setupAudioToggle(audioWind, windBtn, windVol);
    if (wavesBtn && wavesVol) setupAudioToggle(audioWaves, wavesBtn, wavesVol);
  }

  function renderStudio() {
    const lastTopic = localStorage.getItem(LS_LAST_TOPIC) || "";
    el("#app").innerHTML = `
      <div class="min-h-screen pb-20 relative z-10">
        <header class="glass-panel sticky top-0 z-40 p-6 flex flex-wrap justify-between items-center ui">
          <div class="flex items-center gap-4 cursor-pointer group">
            <div class="text-3xl">🌙</div>
            <div>
              <div class="font-magic text-2xl text-[color:var(--text)] leading-tight">SleepyStory Studio</div>
              <div class="text-xs text-[color:var(--muted)] -mt-1 font-semibold">Connected • Ready • Synced</div>
            </div>
          </div>
          <div class="flex gap-2 items-center">
            <button id="setupBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-[color:var(--text)] rounded-xl px-4 py-2 text-sm font-semibold transition-all">Setup</button>
            <button id="exportBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-[color:var(--text)] rounded-xl px-4 py-2 text-sm font-semibold transition-all">Export</button>
            <button id="importBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-[color:var(--text)] rounded-xl px-4 py-2 text-sm font-semibold transition-all">Import</button>
          </div>
        </header>

        <main class="max-w-6xl mx-auto px-6 pt-8 space-y-8">
          <!-- Ambient Sound Control Bar -->
          <section class="glass-panel rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between ui">
            <span class="text-xs font-black uppercase tracking-widest text-indigo-300">Ambient Sounds</span>
            <div class="flex flex-wrap gap-6 items-center">
              <div class="flex items-center gap-2">
                <button id="soundRainPlay" class="p-1.5 text-slate-400 hover:text-slate-200 transition-colors" title="Toggle Rain"><span class="text-lg">🌧️</span></button>
                <input type="range" id="soundRainVolume" min="0" max="1" step="0.05" value="0" class="sound-slider" />
              </div>
              <div class="flex items-center gap-2">
                <button id="soundWindPlay" class="p-1.5 text-slate-400 hover:text-slate-200 transition-colors" title="Toggle Wind"><span class="text-lg">🍃</span></button>
                <input type="range" id="soundWindVolume" min="0" max="1" step="0.05" value="0" class="sound-slider" />
              </div>
              <div class="flex items-center gap-2">
                <button id="soundWavesPlay" class="p-1.5 text-slate-400 hover:text-slate-200 transition-colors" title="Toggle Ocean Waves"><span class="text-lg">🌊</span></button>
                <input type="range" id="soundWavesVolume" min="0" max="1" step="0.05" value="0" class="sound-slider" />
              </div>
            </div>
          </section>

          <!-- Make a Bedtime Adventure Form -->
          <section id="formSection" class="glass-panel rounded-[2rem] overflow-hidden ui">
            <div class="p-8 md:p-10">
              <h2 class="font-magic text-4xl text-slate-100 leading-tight">Make a Bedtime Adventure</h2>
              <p class="text-slate-300 mt-2 text-base">Pick a cozy idea. I’ll weave it into a calm, page‑turning story.</p>

              <div class="mt-8 grid md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label class="text-sm font-bold text-slate-400">Story Topic</label>
                  <input id="topicInput" class="mt-2 w-full text-lg px-5 py-4 rounded-[1.25rem] border border-white/10 bg-black/40 text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-950 glow-focus" placeholder="e.g., a sleepy dragon who learns to yawn" value="${escapeHtml(lastTopic)}" />
                  <div class="mt-3 text-xs text-slate-500 italic">Your key is stored on this device. Export to keep it safe.</div>
                </div>
                <button id="startBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-magic text-2xl px-8 py-5 rounded-[1.75rem] shadow-xl transition-all active:scale-95 border-b-[8px] border-indigo-800">
                  Start Magic ✨
                </button>
              </div>

              <div id="status" class="mt-6 text-slate-400 text-sm"></div>
              <div id="error" class="mt-4 text-red-400 font-semibold text-sm"></div>
            </div>
          </section>

          <!-- 3D Book Section -->
          <section id="storySection" class="hidden">
            <div class="glass-panel rounded-[2rem] overflow-hidden">
              <div class="p-6 md:p-8">
                <!-- Book Top Bar -->
                <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4 ui">
                  <div>
                    <div class="font-magic text-3xl text-indigo-300" id="storyTitle"></div>
                    <div class="text-slate-400 text-xs mt-1 font-semibold" id="storyMeta"></div>
                  </div>
                  <div class="flex gap-2 items-center">
                    <button id="newStoryBtn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl px-4 py-2 text-sm font-semibold transition-all">New Story</button>
                  </div>
                </div>

                <!-- 3D Book Viewport -->
                <div class="book-viewport">
                  <div class="book-wrap" id="bookWrap">
                    <div class="book-spine"></div>
                    <div class="book-pages-container">
                      <!-- Left Page Face -->
                      <div class="book-page-face left-side" id="bookLeftPage">
                        <!-- Illustration content injected dynamically -->
                      </div>
                      <!-- Right Page Face -->
                      <div class="book-page-face right-side" id="bookRightPage">
                        <!-- Narrative & Controls injected dynamically -->
                      </div>
                    </div>
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
      stopNarration();
      el("#storySection").classList.add("hidden");
      el("#formSection").classList.remove("hidden");
      el("#error").textContent = "";
      el("#status").textContent = "";
      el("#topicInput").focus();
    });
    el("#exportBtn").addEventListener("click", exportData);
    el("#importBtn").addEventListener("click", importData);

    wireAudioControls();

    // if bookmark exists, show "resume" hint
    const bm = getBookmark();
    if (bm) {
      el("#status").innerHTML = `<span class="font-semibold text-indigo-400">Bookmark found:</span> “${escapeHtml(bm.storyTitle || "Story")}” (page ${bm.pageIndex + 1}). <button id="resumeBookmarkBtn" class="underline text-indigo-300 hover:text-indigo-200 font-bold ml-1">Resume Story</button>`;
      el("#resumeBookmarkBtn").addEventListener("click", () => {
        // Load latest from server or local
        loadBookmarkFromStorage();
      });
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
    el("#status").textContent = "Weaving magic…";
    const startBtn = el("#startBtn");
    startBtn.disabled = true;
    startBtn.classList.add("opacity-60");

    try {
      const raw = await geminiGenerateStory(topic);
      currentStory = normalizeStory(raw);
      currentPage = 0;
      el("#formSection").classList.add("hidden");
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
    const chars = (currentStory.characters || []).map(c => c?.emoji ? `${c.emoji} ${c.name || ""}` : (c?.name || "")).filter(Boolean);
    el("#storyMeta").textContent = chars.length ? `Characters: ${chars.join(" • ")}` : "A calm, cozy adventure.";
    updatePage();
  }

  // ------------------------- 3D Page Flipping System -------------------------
  let isFlipping = false;

  function triggerPageFlip(nextPageIdx) {
    if (isFlipping) return;

    const pages = currentStory.pages || [];
    const oldPageIdx = currentPage;
    const isNext = nextPageIdx > oldPageIdx;

    // Mobile fallback: immediate update (no 3D layout animations)
    if (window.innerWidth <= 768) {
      currentPage = nextPageIdx;
      updatePage();
      return;
    }

    isFlipping = true;
    stopNarration();

    const bookWrap = el("#bookWrap");

    // Spawn flipping sheet
    const sheet = document.createElement("div");
    sheet.className = "book-flipping-sheet";

    const frontSide = document.createElement("div");
    frontSide.className = "flipping-page-side front-side";

    const backSide = document.createElement("div");
    backSide.className = "flipping-page-side back-side";

    sheet.appendChild(frontSide);
    sheet.appendChild(backSide);
    bookWrap.appendChild(sheet);

    const oldP = pages[oldPageIdx] || {};
    const newP = pages[nextPageIdx] || {};

    if (isNext) {
      // Turn right page to left
      frontSide.innerHTML = getPageTextHTML(oldPageIdx, oldP);
      backSide.innerHTML = getPageIllustrationHTML(nextPageIdx, newP);

      // Render new text in static right slot (waiting behind sheet)
      el("#bookRightPage").innerHTML = getPageTextHTML(nextPageIdx, newP);

      // Force reflow
      sheet.offsetHeight;

      // Flip transition
      sheet.classList.add("flipped");

      setTimeout(() => {
        currentPage = nextPageIdx;
        updatePage();
        sheet.remove();
        isFlipping = false;
      }, 750);
    } else {
      // Turn left page to right (prev)
      frontSide.innerHTML = getPageIllustrationHTML(oldPageIdx, oldP);
      backSide.innerHTML = getPageTextHTML(oldPageIdx, oldP);

      // Render new illustration in static left slot
      el("#bookLeftPage").innerHTML = getPageIllustrationHTML(nextPageIdx, newP);

      // Set initial state
      sheet.classList.add("flipped");

      // Force reflow
      sheet.offsetHeight;

      // Unflip transition
      sheet.classList.remove("flipped");

      setTimeout(() => {
        currentPage = nextPageIdx;
        updatePage();
        sheet.remove();
        isFlipping = false;
      }, 750);
    }
  }

  // ------------------------- Cosmic Dreamscape Extras -------------------------
  let _autoFlipEnabled = true;
  let _selectedVoiceIndex = 0;
  let _audioCtx = null;

  function playCozyChime() {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === "suspended") {
        _audioCtx.resume();
      }
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      
      osc.type = "sine";
      const now = _audioCtx.currentTime;
      
      const chimes = [1046.50, 1318.51, 1567.98, 1760.00, 2093.00];
      const freq = chimes[Math.floor(Math.random() * chimes.length)];
      
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      
      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {
      console.warn("Web Audio chime failed", e);
    }
  }

  function spawnSparkles(x, y) {
    const container = document.body;
    const count = 12;
    const colors = ["#fbcfe8", "#fef08a", "#c7d2fe", "#a7f3d0", "#bae6fd"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "sparkle-particle font-magic select-none";
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.innerText = ["✨", "⭐", "🌙", "🌟"][Math.floor(Math.random() * 4)];
      p.style.color = colors[Math.floor(Math.random() * colors.length)];
      p.style.fontSize = (Math.random() * 12 + 16) + "px";
      
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 80 + 30;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      
      p.animate([
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], {
        duration: 800 + Math.random() * 400,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        fill: "forwards"
      });
      
      container.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  function populateVoicesDropdown(selectEl) {
    if (!selectEl) return;
    const voices = window.speechSynthesis.getVoices();
    selectEl.innerHTML = "";
    if (voices.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "Default Voice";
      opt.value = "0";
      selectEl.appendChild(opt);
      return;
    }
    voices.forEach((v, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `${v.name} (${v.lang})`;
      if (idx === _selectedVoiceIndex) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });
  }

  const HS_COORDS = [
    [ { x: 22, y: 35 }, { x: 78, y: 28 } ],
    [ { x: 18, y: 48 }, { x: 82, y: 32 } ],
    [ { x: 28, y: 22 }, { x: 74, y: 58 } ],
    [ { x: 32, y: 52 }, { x: 84, y: 42 } ],
    [ { x: 12, y: 32 }, { x: 88, y: 64 } ],
    [ { x: 22, y: 62 }, { x: 78, y: 48 } ]
  ];

  function getPageIllustrationHTML(idx, page) {
    const sceneSvg = getSvgBackdrop(page.text || "", page.title || "");
    const emojis = getPageEmojis(page.text || "", page.title || "");
    const coords = HS_COORDS[idx % HS_COORDS.length];
    const hotspotsHtml = coords.map((c, hIdx) => `
      <div class="hotspot-star" style="left: ${c.x}%; top: ${c.y}%;" data-hidx="${hIdx}">⭐</div>
    `).join("");

    const prevCornerHtml = idx > 0 ? `<div class="page-corner-zone-left" id="cornerPrevBtn" title="Previous Page"></div>` : "";

    return `
      <div class="h-full flex flex-col justify-between relative overflow-hidden select-none">
        <!-- SVG Backdrop -->
        <div class="absolute inset-0 z-0 opacity-80 pointer-events-none">${sceneSvg}</div>
        
        <!-- Interactive Hotspots -->
        ${hotspotsHtml}
        
        <!-- Corner turn trigger -->
        ${prevCornerHtml}
        
        <!-- Top Info -->
        <div class="relative z-10 text-[10px] font-mono tracking-widest text-indigo-300/60 uppercase">SleepyStory • Scene ${idx + 1}</div>
        
        <!-- Animated Emoji Mascot -->
        <div class="relative z-10 flex-1 flex items-center justify-center">
          <div id="mascotWrapper" class="text-7xl animate-studio-pulse drop-shadow-xl select-none" style="animation-duration: 4s; transition: transform 0.6s cubic-bezier(0.25, 1.5, 0.5, 1);">
            ${emojis}
          </div>
        </div>
        
        <!-- Page Title -->
        <div class="relative z-10 font-magic text-2xl text-[color:var(--page-heading)]">${escapeHtml(page.title || page.heading || "Bedtime Story")}</div>
      </div>
    `;
  }

  function getPageTextHTML(idx, page) {
    const pages = currentStory.pages || [];
    const prevDisabled = idx === 0 ? "disabled opacity-40 cursor-not-allowed" : "";
    const nextDisabled = idx >= pages.length - 1 ? "disabled opacity-40 cursor-not-allowed" : "";
    const autoFlipChecked = _autoFlipEnabled ? "checked" : "";
    const nextCornerHtml = idx < pages.length - 1 ? `<div class="page-corner-zone-right" id="cornerNextBtn" title="Next Page"></div>` : "";

    return `
      <div class="h-full flex flex-col justify-between relative z-10">
        <!-- Corner turn trigger -->
        ${nextCornerHtml}

        <!-- Narration Controls / Header -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div class="text-xs font-mono font-bold text-indigo-300/60">PAGE ${idx + 1} OF ${pages.length}</div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer">
              <input type="checkbox" id="autoFlipToggle" ${autoFlipChecked} class="rounded border-white/15 bg-white/5 text-indigo-600 focus:ring-indigo-500" />
              <span>Auto-Flip</span>
            </label>
            <select id="cozyVoiceSelect" class="bg-white/10 hover:bg-white/15 border border-white/10 text-slate-300 rounded-xl px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500 select-none max-w-[100px] md:max-w-[140px]"></select>
            <button id="narrateBtn" class="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-bold px-3 py-1 text-[11px] rounded-xl flex items-center gap-1 border border-indigo-500/20 transition-all select-none">
              🗣️ Read to Me
            </button>
          </div>
        </div>
        
        <!-- Narrative text content -->
        <div class="flex-1 my-4 overflow-y-auto custom-scrollbar">
          <div id="narrativeBody" class="text-[color:var(--page-text)] text-base md:text-[17px] leading-relaxed whitespace-pre-wrap font-medium">
            ${escapeHtml(page.text || page.content || page.body || "")}
          </div>
        </div>
        
        <!-- Page Footer Navigation -->
        <div class="flex items-center justify-between border-t border-white/10 pt-3 mt-auto">
          <button id="prevBtn" ${prevDisabled} class="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold px-4 py-2 text-xs rounded-xl transition-all select-none">
            ← Prev
          </button>
          <button id="bookmarkBtn" class="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold px-4 py-2 text-xs rounded-xl transition-all select-none">
            Bookmark
          </button>
          <button id="nextBtn" ${nextDisabled} class="bg-indigo-600/80 hover:bg-indigo-500/80 text-white border border-indigo-500/30 font-bold px-4 py-2 text-xs rounded-xl transition-all select-none">
            Next →
          </button>
        </div>
      </div>
    `;
  }

  // ------------------------- Dynamic SVG Backdrop scenes -------------------------
  function getSvgBackdrop(text, title) {
    const raw = (text + " " + title).toLowerCase();

    if (raw.includes("dragon") || raw.includes("fire") || raw.includes("flame")) {
      return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
          <defs>
            <linearGradient id="fireGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#f97316" stop-opacity="0.12"/>
              <stop offset="50%" stop-color="#ef4444" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#fireGrad)"/>
          <path d="M-10 100 L15 75 L35 90 L60 68 L80 82 L110 100 Z" fill="#1e152a" opacity="0.25"/>
          <circle cx="50" cy="40" r="1.2" fill="#fff" opacity="0.6"/>
          <circle cx="20" cy="20" r="0.8" fill="#fff" opacity="0.4"/>
        </svg>
      `;
    }
    if (raw.includes("forest") || raw.includes("tree") || raw.includes("woods") || raw.includes("pines")) {
      return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
          <defs>
            <linearGradient id="forestGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#forestGrad)"/>
          <path d="M5 100 L5 82 L0 82 L7 68 L2 68 L10 52 L18 68 L13 68 L20 82 L15 82 L15 100 Z" fill="#061f15" opacity="0.3"/>
          <path d="M80 100 L80 78 L74 78 L82 62 L76 62 L84 48 L92 62 L86 62 L94 78 L88 78 L88 100 Z" fill="#061f15" opacity="0.2"/>
          <circle cx="30" cy="30" r="18" fill="#fef08a" opacity="0.04"/>
        </svg>
      `;
    }
    if (raw.includes("castle") || raw.includes("tower") || raw.includes("palace") || raw.includes("kingdom")) {
      return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
          <defs>
            <linearGradient id="castleGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#castleGrad)"/>
          <path d="M-10 100 L0 78 L5 78 L5 62 L10 62 L10 78 L25 78 L25 55 L30 55 L30 45 L35 55 L40 55 L40 78 L60 78 L65 58 L70 58 L70 48 L75 58 L80 58 L80 100 Z" fill="#0f0c24" opacity="0.3"/>
        </svg>
      `;
    }
    if (raw.includes("sea") || raw.includes("ocean") || raw.includes("water") || raw.includes("ship") || raw.includes("boat") || raw.includes("waves")) {
      return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
          <defs>
            <linearGradient id="seaGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#seaGrad)"/>
          <path d="M-10 100 Q15 88 40 94 T90 88 T110 100 Z" fill="#041829" opacity="0.25"/>
          <path d="M-10 100 Q20 94 50 98 T110 94 T120 100 Z" fill="#041829" opacity="0.4"/>
        </svg>
      `;
    }
    if (raw.includes("space") || raw.includes("star") || raw.includes("planet") || raw.includes("rocket") || raw.includes("sky")) {
      return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
          <defs>
            <linearGradient id="spaceGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="#ec4899" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#spaceGrad)"/>
          <circle cx="75" cy="35" r="7" fill="#f472b6" opacity="0.12"/>
          <ellipse cx="75" cy="35" rx="12" ry="2.5" fill="none" stroke="#f472b6" stroke-width="0.4" opacity="0.25" transform="rotate(-15, 75, 35)"/>
        </svg>
      `;
    }

    // Default: Moon and landscape
    return `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
        <defs>
          <linearGradient id="defGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#defGrad)"/>
        <circle cx="80" cy="25" r="9" fill="#fef08a" opacity="0.06"/>
        <path d="M-10 100 L30 88 L60 92 L110 84 L110 100 Z" fill="#0d112b" opacity="0.25"/>
      </svg>
    `;
  }

  function getPageEmojis(text, title) {
    const raw = (text + " " + title).toLowerCase();
    let ems = [];
    if (raw.includes("dragon")) ems.push("🐉");
    if (raw.includes("castle") || raw.includes("knight") || raw.includes("prince")) ems.push("🏰");
    if (raw.includes("forest") || raw.includes("tree")) ems.push("🌲");
    if (raw.includes("star") || raw.includes("moon") || raw.includes("sky")) ems.push("⭐");
    if (raw.includes("bear") || raw.includes("animal")) ems.push("🧸");
    if (raw.includes("wizard") || raw.includes("magic") || raw.includes("wand")) ems.push("🧙‍♂️");
    if (raw.includes("dream") || raw.includes("sleep")) ems.push("😴");

    if (ems.length === 0) ems.push("🪄");
    return ems.slice(0, 2).join(" ");
  }

  function updatePage() {
    const pages = currentStory.pages || [];
    const p = pages[currentPage] || {};

    // Render contents into left (illustration) and right (text) static blocks
    el("#bookLeftPage").innerHTML = getPageIllustrationHTML(currentPage, p);
    el("#bookRightPage").innerHTML = getPageTextHTML(currentPage, p);

    attachPageEventListeners();
    scheduleServerSync();
  }

  function attachPageEventListeners() {
    const prev = el("#prevBtn");
    const next = el("#nextBtn");
    const bookmark = el("#bookmarkBtn");
    const narrate = el("#narrateBtn");
    
    const cornerPrev = el("#cornerPrevBtn");
    const cornerNext = el("#cornerNextBtn");
    const autoFlip = el("#autoFlipToggle");
    const voiceSelect = el("#cozyVoiceSelect");

    if (prev && !prev.disabled) {
      prev.addEventListener("click", () => triggerPageFlip(currentPage - 1));
    }
    if (cornerPrev) {
      cornerPrev.addEventListener("click", () => {
        if (currentPage > 0) triggerPageFlip(currentPage - 1);
      });
    }

    if (next && !next.disabled) {
      next.addEventListener("click", () => triggerPageFlip(currentPage + 1));
    }
    if (cornerNext) {
      cornerNext.addEventListener("click", () => {
        if (currentPage < (currentStory.pages || []).length - 1) triggerPageFlip(currentPage + 1);
      });
    }

    if (bookmark) {
      bookmark.addEventListener("click", saveBookmark);
    }
    if (narrate) {
      narrate.addEventListener("click", toggleNarration);
    }

    if (autoFlip) {
      autoFlip.addEventListener("change", (e) => {
        _autoFlipEnabled = e.target.checked;
      });
    }

    if (voiceSelect) {
      populateVoicesDropdown(voiceSelect);
      voiceSelect.addEventListener("change", (e) => {
        _selectedVoiceIndex = Number(e.target.value) || 0;
      });
    }

    // Attach hotspot triggers
    els(".hotspot-star").forEach(star => {
      star.addEventListener("click", (e) => {
        e.stopPropagation();
        playCozyChime();
        spawnSparkles(e.clientX, e.clientY);
        
        const mascot = el("#mascotWrapper");
        if (mascot) {
          // Alternate between bounce and spin animations
          const animClass = Math.random() > 0.5 ? "mascot-bounce" : "mascot-spin";
          mascot.classList.add(animClass);
          setTimeout(() => {
            mascot.classList.remove("mascot-bounce", "mascot-spin");
          }, 800);
        }
      });
    });
  }

  // ------------------------- Speech Synthesis Narration -------------------------
  let activeUtterance = null;

  function toggleNarration() {
    if (activeUtterance) {
      stopNarration();
    } else {
      const p = currentStory.pages[currentPage] || {};
      const text = p.text || p.content || p.body || "";
      const bodyEl = el("#narrativeBody");
      if (bodyEl && text) startNarration(text, bodyEl);
    }
  }

  function startNarration(text, containerEl) {
    window.speechSynthesis.cancel();
    if (!text) return;

    const words = text.split(/\s+/);
    containerEl.innerHTML = words.map((w, idx) => `<span id="word-${idx}">${escapeHtml(w)}</span>`).join(" ");

    activeUtterance = new SpeechSynthesisUtterance(text);
    activeUtterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices[_selectedVoiceIndex];
    if (selectedVoice) {
      activeUtterance.voice = selectedVoice;
    } else {
      const cozyVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Natural"));
      if (cozyVoice) activeUtterance.voice = cozyVoice;
    }

    activeUtterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIndex = event.charIndex;
        let cumulativeLength = 0;
        let activeWordIdx = 0;
        for (let i = 0; i < words.length; i++) {
          cumulativeLength += words[i].length + 1;
          if (charIndex < cumulativeLength) {
            activeWordIdx = i;
            break;
          }
        }

        containerEl.querySelectorAll(".word-highlight").forEach(el => el.classList.remove("word-highlight"));
        const wordEl = containerEl.querySelector(`#word-${activeWordIdx}`);
        if (wordEl) {
          wordEl.classList.add("word-highlight");
        }
      }
    };

    activeUtterance.onend = () => {
      containerEl.innerHTML = escapeHtml(text);
      activeUtterance = null;
      const btn = el("#narrateBtn");
      if (btn) btn.textContent = "🗣️ Read to Me";
      if (_autoFlipEnabled && currentPage < (currentStory.pages || []).length - 1) {
        setTimeout(() => {
          if (!activeUtterance) {
            triggerPageFlip(currentPage + 1);
          }
        }, 800);
      }
    };

    activeUtterance.onerror = () => {
      containerEl.innerHTML = escapeHtml(text);
      activeUtterance = null;
      const btn = el("#narrateBtn");
      if (btn) btn.textContent = "🗣️ Read to Me";
    };

    window.speechSynthesis.speak(activeUtterance);
    const btn = el("#narrateBtn");
    if (btn) btn.textContent = "⏹️ Stop Narration";
  }

  function stopNarration() {
    window.speechSynthesis.cancel();
    activeUtterance = null;
    const p = currentStory.pages[currentPage] || {};
    const bodyEl = el("#narrativeBody");
    if (bodyEl) {
      bodyEl.innerHTML = escapeHtml(p.text || p.content || p.body || "");
    }
    const btn = el("#narrateBtn");
    if (btn) btn.textContent = "🗣️ Read to Me";
  }

  // ------------------------- Bookmarks & Export -------------------------
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

  function loadBookmarkFromStorage() {
    const bm = getBookmark();
    if (bm && currentStory) {
      currentPage = Math.max(0, Math.min(Number(bm.pageIndex) || 0, (currentStory.pages || []).length - 1));
      el("#formSection").classList.add("hidden");
      renderStory();
    }
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
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
      ensureKeyOrGate().then((ok) => { if (ok) renderStudio(); });
    });
  }

  async function boot() {
    wireKeyModal();
    const ok = await ensureKeyOrGate();
    if (ok) {
      renderStudio();
      await serverLoadLatest();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
