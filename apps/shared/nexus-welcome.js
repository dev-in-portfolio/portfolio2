// nexus-welcome.js
// Non-blocking welcome + preferences panel for index.html (Nexus).
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!window.NexusPrefs) return;

  // Only run on Nexus (index.html). If you rename, update this check.
  const isNexus = /(^|\/)index\.html(\?|#|$)/i.test(location.pathname) || location.pathname.endsWith("/");
  if (!isNexus) return;

  const prefsAPI = window.NexusPrefs;

  const WELCOME_SEEN_KEY = "NEXUS_WELCOME_SEEN_V3";

  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (_) { return ""; } }
  function lsSet(k,v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (_) {} }

  // Inject minimal CSS (kept isolated under .nxw-*)
  const css = `
.nxw-wrap{position:fixed;right:16px;bottom:16px;z-index:9998;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
.nxw-btn{width:44px;height:44px;border-radius:16px;border:1px solid var(--border,rgba(255,255,255,0.12));background:var(--panel,rgba(255,255,255,0.06));color:var(--text,#fff);backdrop-filter:blur(18px);box-shadow:0 18px 40px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;}
.nxw-panel{margin-top:10px;width:min(420px, calc(100vw - 32px));border-radius:20px;border:1px solid var(--border,rgba(255,255,255,0.12));background:var(--panel,rgba(255,255,255,0.06));backdrop-filter:blur(18px);box-shadow:0 22px 60px rgba(0,0,0,0.45);color:var(--text,#fff);overflow:hidden;}
.nxw-hidden{display:none;}
.nxw-head{display:flex;align-items:flex-start;gap:12px;justify-content:space-between;padding:14px 14px 10px;}
.nxw-title{font-weight:800;letter-spacing:0.2px;font-size:16px;line-height:1.2;}
.nxw-sub{font-size:12px;color:var(--muted,rgba(255,255,255,0.72));margin-top:4px;line-height:1.35;}
.nxw-x{border:none;background:transparent;color:var(--muted,rgba(255,255,255,0.72));cursor:pointer;font-size:18px;line-height:1;padding:4px 8px;border-radius:10px;}
.nxw-x:hover{background:var(--panel2,rgba(0,0,0,0.28));color:var(--text,#fff);}
.nxw-body{padding:0 14px 14px;}
.nxw-note{font-size:12px;color:var(--muted,rgba(255,255,255,0.72));line-height:1.35;margin:0 0 12px;}
.nxw-pillrow{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;}
.nxw-pill{font-size:11px;padding:6px 10px;border-radius:999px;border:1px solid var(--border,rgba(255,255,255,0.12));background:var(--panel2,rgba(0,0,0,0.28));color:var(--text,#fff);}
.nxw-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.nxw-field label{display:block;font-size:11px;color:var(--muted,rgba(255,255,255,0.72));margin:0 0 6px;}
.nxw-field select{width:100%;padding:10px 10px;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,0.12));background:rgba(0,0,0,0.18);color:var(--text,#fff);outline:none;}
html[data-theme="light"] .nxw-field select{background:rgba(255,255,255,0.8);color:var(--text,#0b1220);}
html[data-theme="contrast"] .nxw-field select{background:#000;color:#fff;border-color:#fff;}
.nxw-more{margin:10px 0 0;}
.nxw-morebtn{border:none;background:transparent;color:var(--accent,var(--lab-accent,#38bdf8));cursor:pointer;font-size:12px;padding:6px 0;}
.nxw-toggles{display:grid;grid-template-columns:1fr;gap:8px;margin-top:6px;}
.nxw-toggle{display:flex;gap:10px;align-items:flex-start;padding:10px 10px;border-radius:16px;border:1px solid var(--border,rgba(255,255,255,0.12));background:var(--panel2,rgba(0,0,0,0.28));}
.nxw-toggle input{margin-top:2px;}
.nxw-toggle b{display:block;font-size:12px;line-height:1.2;}
.nxw-toggle span{display:block;font-size:11px;color:var(--muted,rgba(255,255,255,0.72));line-height:1.35;margin-top:4px;}
.nxw-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
.nxw-primary,.nxw-secondary{border-radius:14px;border:1px solid var(--border,rgba(255,255,255,0.12));padding:10px 12px;font-weight:700;cursor:pointer;}
.nxw-primary{background:linear-gradient(135deg, rgba(136,99,255,0.85), rgba(56,189,248,0.35));color:#fff;}
.nxw-secondary{background:var(--panel2,rgba(0,0,0,0.28));color:var(--text,#fff);}
.nxw-link{margin-left:auto;border:none;background:transparent;color:var(--muted,rgba(255,255,255,0.72));cursor:pointer;padding:10px 8px;border-radius:12px;}
.nxw-link:hover{background:var(--panel2,rgba(0,0,0,0.28));color:var(--text,#fff);}
@media (max-width:520px){.nxw-grid{grid-template-columns:1fr;}}


.nxw-tools{margin-top:12px;padding-top:10px;border-top:1px solid var(--border,rgba(255,255,255,0.12));display:flex;flex-direction:column;gap:8px;}
.nxw-toolrow{display:flex;gap:8px;flex-wrap:wrap;}
.nxw-tool{border:1px solid var(--border,rgba(255,255,255,0.12));background:var(--panel,rgba(255,255,255,0.06));color:var(--text,#fff);border-radius:12px;padding:8px 10px;font-size:12px;cursor:pointer}
.nxw-tool:hover{background:var(--panel2,rgba(0,0,0,0.28))}
.nxw-verifyout{font-size:11px;line-height:1.35;color:var(--muted,rgba(255,255,255,0.72));}
.nxw-verifyout b{color:var(--text,#fff);}

`;

  const style = document.createElement("style");
  style.id = "nxw-style";
  style.textContent = css;
  document.head.appendChild(style);

  // Build UI
  const wrap = document.createElement("div");
  wrap.className = "nxw-wrap";
  wrap.innerHTML = `
    <button class="nxw-btn" id="nxw-toggle" aria-label="Open Nexus preferences">⚙️</button>
    <div class="nxw-panel nxw-hidden" id="nxw-panel" role="dialog" aria-modal="false" aria-label="Nexus preferences">
      <div class="nxw-head">
        <div>
          <div class="nxw-title">Welcome to Nexus</div>
          <div class="nxw-sub">Quick setup (10 seconds). Change anytime.</div>
        </div>
        <button class="nxw-x" id="nxw-close" aria-label="Dismiss">✕</button>
      </div>
      <div class="nxw-body">
        <p class="nxw-note">
          Nexus is a portal to interactive portfolio apps. Some experiences are <b>graphics‑intensive</b>, so startup time depends on your device.
          Pick a few preferences so you don’t get stuck staring at a load screen wondering if reality froze.
        </p>
        <div class="nxw-pillrow" id="nxw-pills"></div>

        <div class="nxw-grid">
          <div class="nxw-field">
            <label for="nxw-theme">Theme</label>
            <select id="nxw-theme">
              <option value="dark">Dark (default)</option>
              <option value="light">Light</option>
              <option value="contrast">High Contrast</option>
              <option value="system">Match my device</option>
            </select>
          </div>
          <div class="nxw-field">
            <label for="nxw-perf">Performance</label>
            <select id="nxw-perf">
              <option value="auto">Auto (recommended)</option>
              <option value="lite">Lite (fastest)</option>
              <option value="balanced">Balanced</option>
              <option value="ultra">Ultra (best visuals)</option>
            </select>
          </div>
          <div class="nxw-field">
            <label for="nxw-text">Text size</label>
            <select id="nxw-text">
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">XL</option>
            </select>
          </div>
          <div class="nxw-field">
            <label>Device</label>
            <select id="nxw-device" disabled>
              <option value="phone">Phone</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Desktop / Laptop</option>
            </select>
          </div>
        </div>

        <div class="nxw-more">
          <button class="nxw-morebtn" id="nxw-morebtn" type="button">More options ▾</button>
          <div class="nxw-toggles nxw-hidden" id="nxw-more">
            <label class="nxw-toggle"><input type="checkbox" id="nxw-motion"><div><b>Reduce motion</b><span>Less animation + fewer transitions (also helps performance).</span></div></label>
            <label class="nxw-toggle"><input type="checkbox" id="nxw-data"><div><b>Data saver</b><span>Don’t preload heavy assets. Better on mobile/hotspots.</span></div></label>
            <label class="nxw-toggle"><input type="checkbox" id="nxw-hints"><div><b>Show hints</b><span>Tooltips + small shortcuts. Good for first-time visitors.</span></div></label>
            <label class="nxw-toggle"><input type="checkbox" id="nxw-sound"><div><b>Sound</b><span>Allow app sound effects when available.</span></div></label>
            <label class="nxw-toggle"><input type="checkbox" id="nxw-preload"><div><b>Preload featured apps</b><span>Speeds up next click, uses more bandwidth.</span></div></label>
            <label class="nxw-toggle"><input type="checkbox" id="nxw-remember"><div><b>Remember last app</b><span>Nexus can offer “Continue where you left off.”</span></div></label>
            <label class="nxw-toggle"><input type="checkbox" id="nxw-focus"><div><b>Always show focus outlines</b><span>Better keyboard navigation / accessibility.</span></div></label>
          </div>
        <div class="nxw-tools">
          <div class="nxw-toolrow">
            <button class="nxw-tool" id="nxw-verify" type="button">Verify app files</button>
            <button class="nxw-tool" id="nxw-clearcache" type="button">Clear cache</button>
            <button class="nxw-tool" id="nxw-resetprefs" type="button">Reset prefs</button>
            <button class="nxw-tool" id="nxw-reset" type="button">Reset welcome</button>
          </div>
          <div class="nxw-verifyout" id="nxw-verifyout">Tip: If you&apos;re seeing 404s, this will show which files the server can actually see.</div>
        </div>

        </div>

        <div class="nxw-actions">
          <button class="nxw-primary" id="nxw-save">Save settings</button>
          <button class="nxw-secondary" id="nxw-reco">Use recommended</button>
          <button class="nxw-link" id="nxw-skip">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  const $ = (id) => document.getElementById(id);

  const panel = $("nxw-panel");
  const toggle = $("nxw-toggle");
  const close = $("nxw-close");
  const pills = $("nxw-pills");

  const verifyBtn = $("nxw-verify");
  const clearCacheBtn = $("nxw-clearcache");
  const resetPrefsBtn = $("nxw-resetprefs");
  const resetBtn = $("nxw-reset");
  const verifyOut = $("nxw-verifyout");

    // Full integrity manifest (kept in sync with install-check.html)
  const VERIFY_MANIFEST = [
    ".htaccess", "404.html", "Aeon.html", "Anvil.html", "Event.html", "Helios.html", "Helix.html", "Magma.html",
    "String.html", "Tectonic.html", "Transit.html", "UPLOAD_CHECKLIST.txt", "Vortex.html", "ai-diagnostics.js", "ai-engines.js", "ai-personas.js",
    "ai-router.js", "ai_proxy.php", "assets/string-lab-apple-touch.png", "assets/string-lab-icon-32.png", "assets/string-lab-icon.svg", "author-face-placeholder.png", "docs/AI_SETUP.md",     "favicon.ico", "forge-llm-drivers.js", "forge-sdk.cleaned.js", "forge-sdk.llm.js", "helios-apple-touch-icon-180.png", "helios-creator-avatar.png", "helios-favicon-16.png", "helios-favicon-32.png",
    "helix-icon-192.png", "helix-icon.png", "icon-192.png", "icon-512.png", "index.html", "lab-core.css", "lab-shell.css", "lab-shell.js",
    "manifest.webmanifest", "nexus-prefs.js", "nexus-welcome.js", "og.png", "private/.htaccess", "private/AI_SETUP_README.txt", "private/ai-secrets.php", "private/keys.php",
    "private/keys.php.txt", "proxy.php", "quality-hooks.js", "robots.txt", "sitemap.xml", "state-store.js", "sw.js", "tectonic-favicon-64.png",
    "tectonic-favicon.svg", "tectonic-touch-icon-180.png", "telemetry-hub.js", "thumbs/Aeon.jpg", "thumbs/Aeon.webp", "thumbs/Anvil.jpg", "thumbs/Anvil.webp", "thumbs/Event.jpg",
    "thumbs/Event.webp", "thumbs/Helios.jpg", "thumbs/Helios.webp", "thumbs/Helix.jpg", "thumbs/Helix.webp", "thumbs/Magma.jpg", "thumbs/Magma.webp", "thumbs/Notes_251217_205010.jpg",
    "thumbs/Notes_251217_205010.webp", "thumbs/String.jpg", "thumbs/String.webp", "thumbs/Tectonic .jpg", "thumbs/Tectonic.webp", "thumbs/Transit.jpg", "thumbs/Transit.webp", "thumbs/Vortex.jpg",
    "thumbs/Vortex.webp", "thumbs/tectonic.jpg", "transit-3d-orb-192.png", "transit-3d-orb.svg", "ui-helpers.js"
  ];

  // Some servers forbid direct access to certain dotfiles even when present.
  // Treat a 403 on these as "present" so the check reflects reality without leaking contents.
  const FORBIDDEN_OK = new Set([".htaccess"]);

  async function checkOne(url) {
    // Prefer HEAD, fallback to GET if blocked
    try {
      return await fetch(url, {
        method: "HEAD",
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch (_) {
      try {
        return await fetch(url, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
      } catch (_) {
        return { ok:false, status:0 };
      }
    }
  }

  async function verifyFiles() {
    const base = lsGet("NEXUS_BASEPATH_V1") || "./";
    verifyOut.textContent = "Checking files…";
    const ok = [];
    const bad = [];
    for (const rel of VERIFY_MANIFEST) {
      const url = base + rel;
      try {
        const r = await checkOne(url);
        const present = !!r && (r.ok || (FORBIDDEN_OK.has(rel) && r.status === 403));
        if (present) ok.push(rel); else bad.push(rel);
      } catch (_) {
        bad.push(rel);
      }
    }
    const msg =
      `<b>Base:</b> ${base}<br>` +
      `<b>Found:</b> ${ok.length}/${VERIFY_MANIFEST.length}<br>` +
      (bad.length ? `<b>Missing:</b> ${bad.join(", ")}` : `<b>Missing:</b> none 🎉`);
    verifyOut.innerHTML = msg;
  }
if (verifyBtn) verifyBtn.addEventListener("click", verifyFiles);

  // Clear Cache: deletes CacheStorage entries and triggers a reload.
  async function clearCacheAndReload() {
    if (!verifyOut) return;
    verifyOut.textContent = "Clearing cache…";
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
      verifyOut.textContent = "Cache cleared. Reloading…";
    } catch (e) {
      verifyOut.textContent = "Cache clear hit an error (still reloading): " + (e && e.message ? e.message : String(e));
    }
    setTimeout(() => location.reload(), 350);
  }

  // Reset Prefs: restores defaults + clears related localStorage keys, then reloads.
  function resetPrefsAndReload() {
    if (!verifyOut) return;
    try { localStorage.removeItem(prefsAPI.key); } catch (_) {}
    try { localStorage.removeItem("NEXUS_LAST_APP_V1"); } catch (_) {}
    try { prefsAPI.dismissWelcome(false); } catch (_) {}
    try { lsDel(WELCOME_SEEN_KEY); } catch (_) {}
    try { prefsAPI.apply(prefsAPI.defaults()); } catch (_) {}
    verifyOut.textContent = "Preferences reset to defaults. Reloading…";
    setTimeout(() => location.reload(), 350);
  }


    if (clearCacheBtn) clearCacheBtn.addEventListener("click", clearCacheAndReload);

  if (resetPrefsBtn) resetPrefsBtn.addEventListener("click", resetPrefsAndReload);

if (resetBtn) resetBtn.addEventListener("click", () => {
    prefsAPI.dismissWelcome(false);
    lsDel(WELCOME_SEEN_KEY);
    openPanel(true);
  });

  function openPanel(focusFirst) {
    panel.classList.remove("nxw-hidden");
    lsSet(WELCOME_SEEN_KEY, "1");

  }
  function closePanel() {
    panel.classList.add("nxw-hidden");
  }
  toggle.addEventListener("click", () => {
    if (panel.classList.contains("nxw-hidden")) openPanel();
    else closePanel();
  });
  close.addEventListener("click", () => {
    closePanel();
    prefsAPI.dismissWelcome(true);
  });

  // More options expander
  const moreBtn = $("nxw-morebtn");
  const more = $("nxw-more");
  moreBtn.addEventListener("click", () => {
    const hidden = more.classList.contains("nxw-hidden");
    more.classList.toggle("nxw-hidden", !hidden);
    moreBtn.textContent = hidden ? "More options ▴" : "More options ▾";
  });

  function setPills(rec, device) {
    pills.innerHTML = "";
    const items = [
      { t: `Detected: ${device}` },
      { t: `Suggested: ${rec.perf.toUpperCase()}` },
      { t: `Theme: ${rec.theme === "contrast" ? "High Contrast" : rec.theme}` },
      { t: `Text: ${rec.textSize.toUpperCase()}` }
    ];
    items.forEach(i => {
      const el = document.createElement("div");
      el.className = "nxw-pill";
      el.textContent = i.t;
      pills.appendChild(el);
    });
  }

  function fillFrom(p) {
    $("nxw-theme").value = p.theme || "dark";
    $("nxw-perf").value = p.perf || "auto";
    $("nxw-text").value = p.textSize || "md";
    $("nxw-motion").checked = !!p.reduceMotion;
    $("nxw-data").checked = !!p.dataSaver;
    $("nxw-hints").checked = !!p.showHints;
    $("nxw-sound").checked = !!p.sound;
    $("nxw-preload").checked = !!p.preload;
    $("nxw-remember").checked = !!p.rememberLastApp;
    $("nxw-focus").checked = !!p.focusOutlines;

    const device = prefsAPI.deviceTypeGuess();
    $("nxw-device").value = device;
  }

  function readUI() {
    return {
      theme: $("nxw-theme").value,
      perf: $("nxw-perf").value,
      textSize: $("nxw-text").value,
      reduceMotion: $("nxw-motion").checked,
      dataSaver: $("nxw-data").checked,
      showHints: $("nxw-hints").checked,
      sound: $("nxw-sound").checked,
      preload: $("nxw-preload").checked,
      rememberLastApp: $("nxw-remember").checked,
      focusOutlines: $("nxw-focus").checked
    };
  }

  function applyPreloadIfEnabled(p) {
    try {
      if (!p || !p.preload) return;
      if (p.dataSaver) return;
      // Use the same logic as index.html (wifi-only + top-clicked). Falls back internally.
      if (window.NexusPreloader && typeof window.NexusPreloader.maybe === "function") {
        window.NexusPreloader.maybe();
        return;
      }
      // Safety fallback (if something loads out of order): do nothing rather than burning bandwidth.
    } catch (_) {}
  }

  // Buttons
  $("nxw-save").addEventListener("click", () => {
    const saved = prefsAPI.set(readUI());
    applyPreloadIfEnabled(saved);
    closePanel();
    prefsAPI.dismissWelcome(true);
  });

  $("nxw-reco").addEventListener("click", () => {
    const rec = prefsAPI.recommend();
    // recommended uses perf chosen by device; set perf to auto to keep dynamic
    rec.perf = "auto";
    const saved = prefsAPI.set(rec);
    fillFrom(saved);
    applyPreloadIfEnabled(saved);
    closePanel();
    prefsAPI.dismissWelcome(true);
  });

  $("nxw-skip").addEventListener("click", () => {
    closePanel();
    prefsAPI.dismissWelcome(true);
  });

  // First-run behavior: show once per version (even if previously dismissed), and allow forcing via ?welcome=1
  const params = new URLSearchParams(location.search);
  const force = params.get("welcome") === "1";
  const dismissed = prefsAPI.isWelcomeDismissed();
  const seen = lsGet(WELCOME_SEEN_KEY) === "1";
  const rec = prefsAPI.recommend();
  const device = prefsAPI.deviceTypeGuess();

  // Seed preferences on first ever visit
  if (!prefsAPI.hasPrefs()) {
    const saved = prefsAPI.set(rec);
    fillFrom(saved);
  } else {
    fillFrom(prefsAPI.get());
  }
  $("nxw-device").value = device;
  setPills(rec, device);

  if (force) {
    prefsAPI.dismissWelcome(false);
    openPanel(true);
  } else if (!seen) {
    // First time on this build/version: make it visible so the user knows it exists
    openPanel(true);
  } else if (!dismissed && !prefsAPI.hasPrefs()) {
    // Safety fallback: if prefs are missing and it's not dismissed, show it again
    openPanel(true);
  }


  // Keep device pill current on resize (lightweight)
  let resizeT = null;
  window.addEventListener("resize", () => {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const d = prefsAPI.deviceTypeGuess();
      $("nxw-device").value = d;
      setPills(rec, d);
    }, 150);
  });
})();
