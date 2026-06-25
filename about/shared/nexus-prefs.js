// nexus-prefs.js
// Shared preference engine for Nexus + all labs.
// Stores a single prefs object in localStorage and exposes window.NexusPrefs.
//
// Preferences (v1):
//   theme: "dark" | "light" | "contrast" | "system"
//   textSize: "sm" | "md" | "lg" | "xl"
//   perf: "auto" | "lite" | "balanced" | "ultra"
//   reduceMotion: boolean
//   dataSaver: boolean
//   showHints: boolean
//   sound: boolean
//   preload: boolean
//   rememberLastApp: boolean
//   focusOutlines: boolean

(function (global) {
  "use strict";
  if (!global) return;
  if (global.NexusPrefs && typeof global.NexusPrefs.get === "function") return;

  const KEY = "NEXUS_PREFS_V1";
  const DISMISS_KEY = "NEXUS_WELCOME_DISMISSED_V1";
  const LAST_APP_KEY = "NEXUS_LAST_APP_V1";

  function safeLS() {
    try {
      const ls = global.localStorage;
      const k = "__nx_ls_probe__";
      ls.setItem(k, "1");
      ls.removeItem(k);
      return ls;
    } catch (_) {
      return null;
    }
  }

  const ls = safeLS();

  function clampNum(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function media(q) {
    try { return global.matchMedia && global.matchMedia(q).matches; } catch (_) { return false; }
  }

  function deviceTypeGuess() {
    const w = Math.max(global.innerWidth || 0, global.screen?.width || 0);
    const coarse = media("(pointer: coarse)");
    if (w <= 720) return "phone";
    if (w <= 1024 || coarse) return "tablet";
    return "desktop";
  }

  function recommend() {
    const cores = clampNum(global.navigator?.hardwareConcurrency || 4, 1, 64);
    const mem = clampNum(global.navigator?.deviceMemory || 4, 1, 64); // GB-ish; not supported everywhere
    const coarse = media("(pointer: coarse)");
    const smallScreen = (Math.max(global.innerWidth || 0, global.screen?.width || 0) <= 900) || coarse;

    // Theme: respect OS if requested later; default to dark for your brand
    let theme = "dark";
    // If the OS strongly prefers contrast, default to contrast
    if (media("(prefers-contrast: more)")) theme = "contrast";

    // Performance:
    // - low-ish devices or small screens: lite/balanced
    // - strong devices: balanced/ultra
    let perf = "balanced";
    if (smallScreen || cores <= 4 || mem <= 4) perf = "lite";
    else if (cores >= 10 && mem >= 8) perf = "balanced"; // keep sane default; let users opt into ultra

    // Text size: slightly larger on small screens
    let textSize = smallScreen ? "lg" : "md";

    return {
      theme,
      textSize,
      perf,
      reduceMotion: media("(prefers-reduced-motion: reduce)"),
      dataSaver: false,
      showHints: true,
      sound: false,
      preload: false,
      rememberLastApp: true,
      focusOutlines: false
    };
  }

  function defaults() {
    return {
      theme: "dark",
      textSize: "md",
      perf: "auto",
      reduceMotion: media("(prefers-reduced-motion: reduce)"),
      dataSaver: false,
      showHints: true,
      sound: false,
      preload: false,
      rememberLastApp: true,
      focusOutlines: false
    };
  }

  function normalize(p) {
    const d = defaults();
    p = p && typeof p === "object" ? p : {};
    const theme = (p.theme || d.theme);
    const textSize = (p.textSize || d.textSize);
    const perf = (p.perf || d.perf);

    return {
      theme: (theme === "light" || theme === "contrast" || theme === "system") ? theme : "dark",
      textSize: (textSize === "sm" || textSize === "lg" || textSize === "xl") ? textSize : "md",
      perf: (perf === "lite" || perf === "balanced" || perf === "ultra") ? perf : "auto",
      reduceMotion: !!p.reduceMotion,
      dataSaver: !!p.dataSaver,
      showHints: (p.showHints === false) ? false : true,
      sound: !!p.sound,
      preload: !!p.preload,
      rememberLastApp: (p.rememberLastApp === false) ? false : true,
      focusOutlines: !!p.focusOutlines
    };
  }

  function load() {
    if (!ls) return null;
    try {
      const raw = ls.getItem(KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function save(p) {
    const n = normalize(p);
    if (ls) {
      try { ls.setItem(KEY, JSON.stringify(n)); } catch (_) {}
    }
    return n;
  }

  function getEffectiveTheme(p) {
    const t = p.theme || "dark";
    if (t === "system") {
      if (media("(prefers-contrast: more)")) return "contrast";
      return media("(prefers-color-scheme: light)") ? "light" : "dark";
    }
    return t;
  }

  function apply(p) {
    p = normalize(p);
    const html = global.document && global.document.documentElement;
    const body = global.document && global.document.body;
    if (!html) return p;

    const theme = getEffectiveTheme(p);
    html.dataset.theme = theme;
    html.dataset.text = p.textSize;
    html.dataset.perf = (p.perf || "auto");
    html.dataset.reduceMotion = p.reduceMotion ? "1" : "0";
    html.dataset.dataSaver = p.dataSaver ? "1" : "0";
    html.dataset.hints = p.showHints ? "1" : "0";
    html.dataset.sound = p.sound ? "1" : "0";
    html.dataset.preload = p.preload ? "1" : "0";
    html.dataset.focus = p.focusOutlines ? "1" : "0";
    html.dataset.device = deviceTypeGuess();

    if (body) body.dataset.theme = theme; // UIHelpers.setTheme compatibility

    ensureStyle();
    return p;
  }

  function ensureStyle() {
    const doc = global.document;
    if (!doc) return;
    if (doc.getElementById("nx-pref-style")) return;

    const style = doc.createElement("style");
    style.id = "nx-pref-style";
    style.textContent = `
/* NexusPrefs injected theme + accessibility rules */
:root{
  --nx-accent: #38bdf8;
  --nx-accent-soft: rgba(56,189,248,0.14);
  --nx-font-scale: 1;
}

/* Text scaling (best-effort). This scales inherited text. */
html[data-text="sm"]{ --nx-font-scale: 0.94; }
html[data-text="md"]{ --nx-font-scale: 1; }
html[data-text="lg"]{ --nx-font-scale: 1.08; }
html[data-text="xl"]{ --nx-font-scale: 1.16; }
body{ font-size: calc(16px * var(--nx-font-scale)); }

/* Dark is default; other themes override common variable sets used across apps */
html[data-theme="light"]{
  --bg: #f8fafc;
  --panel: rgba(2, 6, 23, 0.06);
  --panel2: rgba(2, 6, 23, 0.04);
  --border: rgba(2, 6, 23, 0.14);
  --text: #0b1220;
  --muted: rgba(2, 6, 23, 0.72);
  --muted2: rgba(2, 6, 23, 0.54);
  --accent: #2563eb;

  --lab-bg: #f8fafc;
  --lab-bg-elevated: rgba(255,255,255,0.92);
  --lab-surface: rgba(255,255,255,0.82);
  --lab-border-subtle: rgba(2, 6, 23, 0.18);
  --lab-text-main: #0b1220;
  --lab-text-muted: rgba(2, 6, 23, 0.62);
  --lab-accent: #2563eb;
  --lab-accent-soft: rgba(37, 99, 235, 0.14);
  --lab-shadow-soft: 0 18px 40px rgba(2, 6, 23, 0.18);
}

html[data-theme="contrast"]{
  --bg: #000;
  --panel: rgba(255,255,255,0.08);
  --panel2: rgba(255,255,255,0.06);
  --border: rgba(255,255,255,0.8);
  --text: #fff;
  --muted: rgba(255,255,255,0.9);
  --muted2: rgba(255,255,255,0.78);
  --accent: #00e5ff;

  --lab-bg: #000;
  --lab-bg-elevated: rgba(0,0,0,0.98);
  --lab-surface: rgba(0,0,0,0.92);
  --lab-border-subtle: rgba(255,255,255,0.9);
  --lab-text-main: #fff;
  --lab-text-muted: rgba(255,255,255,0.88);
  --lab-accent: #00e5ff;
  --lab-accent-soft: rgba(0, 229, 255, 0.20);
  --lab-shadow-soft: 0 0 0 rgba(0,0,0,0);
}

/* Focus outlines (optional) */
html[data-focus="1"] *:focus-visible{
  outline: 3px solid var(--accent, var(--lab-accent, #38bdf8));
  outline-offset: 3px;
  border-radius: 10px;
}

/* Reduce motion (optional) */
html[data-reduce-motion="1"] *{
  scroll-behavior: auto !important;
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
`;
    doc.head.appendChild(style);
  }

  function hasPrefs() {
    return !!load();
  }

  function get() {
    return load() || normalize(recommend()); // recommended if none saved
  }

  function set(partial) {
    const current = load() || recommend();
    const merged = Object.assign({}, current, partial || {});
    const saved = save(merged);
    apply(saved);
    return saved;
  }

  function dismissWelcome(val) {
    if (!ls) return;
    try { ls.setItem(DISMISS_KEY, val ? "1" : "0"); } catch (_) {}
  }

  function isWelcomeDismissed() {
    if (!ls) return false;
    try { return ls.getItem(DISMISS_KEY) === "1"; } catch (_) { return false; }
  }

  function setLastApp(appId) {
    if (!ls) return;
    try { ls.setItem(LAST_APP_KEY, String(appId || "")); } catch (_) {}
  }

  function getLastApp() {
    if (!ls) return "";
    try { return ls.getItem(LAST_APP_KEY) || ""; } catch (_) { return ""; }
  }

  function qualityProfile(p) {
    p = normalize(p || get());
    const perf = (p.perf === "auto") ? normalize(recommend()).perf : p.perf;
    if (perf === "lite") return { renderScale: 0.78, particleScale: 0.65, shadow: 0 };
    if (perf === "ultra") return { renderScale: 1.15, particleScale: 1.2, shadow: 1 };
    return { renderScale: 1.0, particleScale: 1.0, shadow: 1 };
  }

  // Apply immediately on load (best effort)
  try { apply(get()); } catch (_) {}

  global.NexusPrefs = {
    key: KEY,
    recommend,
    defaults,
    hasPrefs,
    get,
    set,
    apply,
    getEffectiveTheme,
    qualityProfile,
    dismissWelcome,
    isWelcomeDismissed,
    setLastApp,
    getLastApp,
    deviceTypeGuess
  };
})(typeof window !== "undefined" ? window : this);

// =======================
// NEXUS ABSOLUTE LINK WIRING (canonical) — NEXUS_ABSOLUTE_LINKS_CANONICAL_V1
// =======================
(function () {
  const CANON = Object.freeze({
    home:         "https://dev-in-portfolio-home.netlify.app/",
    apps:         "https://dev-in-portfolio-apps.netlify.app/",
    utilities:    "https://dev-in-portfolio-utilities.netlify.app/",
    capabilities: "https://dev-in-portfolio-capabilities.netlify.app/",
    about:        "https://dev-in-portfolio-about.netlify.app/",
    contact:      "https://dev-in-portfolio-contact.netlify.app/",
  });

  const LABEL_TO_URL = new Map([
    ["home", CANON.home],
    ["apps", CANON.apps],
    ["utilities", CANON.utilities],
    ["capabilities", CANON.capabilities],
    ["about", CANON.about],
    ["contact", CANON.contact],
  ]);

  const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

  function findNexusContainer() {
    // preferred explicit mounts/classes
    const direct =
      document.querySelector("#nexus-bar") ||
      document.querySelector(".nexus-bar") ||
      document.querySelector('nav[aria-label="Nexus"]') ||
      document.querySelector('nav[aria-label="NEXUS"]') ||
      document.querySelector("nav.nexus") ||
      document.querySelector(".topnav") ||
      document.querySelector(".top-nav");
    if (direct) return direct;

    // fallback: find a nav/header that contains >=3 of the nexus labels
    const candidates = Array.from(document.querySelectorAll("nav, header"));
    let best = null;
    let bestScore = 0;

    for (const el of candidates) {
      const anchors = el.querySelectorAll("a");
      let score = 0;
      anchors.forEach((a) => {
        const key = norm(a.textContent);
        if (LABEL_TO_URL.has(key)) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return bestScore >= 3 ? best : null;
  }

  function applyNexusAbsoluteLinks() {
    const bar = findNexusContainer();
    if (!bar) return;

    const currentOrigin = window.location.origin;

    const anchors = bar.querySelectorAll("a[href]");
    anchors.forEach((a) => {
      const key = norm(a.textContent);

      // rewrite only recognized nexus links
      if (LABEL_TO_URL.has(key)) {
        a.setAttribute("href", LABEL_TO_URL.get(key));
      }

      // active state by origin match (works across separate Netlify sites)
      a.classList.remove("active");
      a.removeAttribute("aria-current");

      if (!LABEL_TO_URL.has(key)) return;

      try {
        const targetOrigin = new URL(a.href, window.location.href).origin;
        if (targetOrigin === currentOrigin) {
          a.classList.add("active");
          a.setAttribute("aria-current", "page");
        }
      } catch (_) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyNexusAbsoluteLinks);
  } else {
    applyNexusAbsoluteLinks();
  }
  // one delayed pass in case nav renders async
  setTimeout(applyNexusAbsoluteLinks, 250);
})();
