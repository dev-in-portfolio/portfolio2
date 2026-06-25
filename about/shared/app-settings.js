/* Portfolio Settings Engine
   - Global defaults stored in localStorage key: portfolio:settings:global
   - Per-app overrides stored in localStorage key: portfolio:settings:<app>
   - Pages may set <body data-app="helios"> etc.
*/
(function(){
  const LS = window.localStorage;
  const KEY_GLOBAL = "portfolio:settings:global";
  const KEY_APP = (app)=>`portfolio:settings:${app}`;

  const DEFAULTS = {
    theme: "dark",              // dark | light | auto
    accent: "#7aa7ff",
    minFontPt: 12,              // enforce >= 12pt
    motion: "full",             // full | reduced
    quality: "high",            // low | med | high
    fpsCap: 60,                 // 30 | 60 | 120
    antialias: true,
    postFx: true,
    gestures: true,
    gestureSensitivity: 1.0,    // 0.5 - 2.0
    showPerfHud: false,
    debug: false
  };

  function safeParse(s){
    try{ return JSON.parse(s); } catch(e){ return null; }
  }

  function clamp(n,min,max){ n=Number(n); if(Number.isNaN(n)) return min; return Math.max(min, Math.min(max, n)); }

  function normalize(obj){
    const o = Object.assign({}, obj || {});
    o.theme = (o.theme === "light" || o.theme === "auto") ? o.theme : "dark";
    o.accent = (typeof o.accent === "string" && o.accent.trim()) ? o.accent.trim() : DEFAULTS.accent;
    o.minFontPt = clamp(o.minFontPt, 12, 24);
    o.motion = (o.motion === "reduced") ? "reduced" : "full";
    o.quality = (o.quality === "low" || o.quality === "med") ? o.quality : "high";
    o.fpsCap = [30,60,120].includes(Number(o.fpsCap)) ? Number(o.fpsCap) : 60;
    o.antialias = !!o.antialias;
    o.postFx = !!o.postFx;
    o.gestures = !!o.gestures;
    o.gestureSensitivity = clamp(o.gestureSensitivity, 0.5, 2.0);
    o.showPerfHud = !!o.showPerfHud;
    o.debug = !!o.debug;
    return o;
  }

  function read(key){
    const v = safeParse(LS.getItem(key) || "");
    return v && typeof v === "object" ? v : null;
  }

  function getAppName(){
    const b = document.body;
    const app = (b && b.dataset && b.dataset.app) ? String(b.dataset.app).toLowerCase() : "";
    return app;
  }

  function getSettings(app){
    const g = normalize(Object.assign({}, DEFAULTS, read(KEY_GLOBAL)));
    if(!app) return g;
    const a = read(KEY_APP(app));
    if(!a) return g;
    return normalize(Object.assign({}, g, a));
  }

  function applyToDocument(s){
    const root = document.documentElement;
    root.style.setProperty("--accent", s.accent);
    root.style.setProperty("--min-font-pt", String(s.minFontPt) + "pt");

    document.documentElement.classList.toggle("theme-light", s.theme === "light");
    document.documentElement.classList.toggle("theme-auto", s.theme === "auto");

    document.documentElement.classList.toggle("motion-reduced", s.motion === "reduced");

    document.documentElement.dataset.quality = s.quality;
    document.documentElement.dataset.fpscap = String(s.fpsCap);
    document.documentElement.dataset.postfx = s.postFx ? "1" : "0";
    document.documentElement.dataset.antialias = s.antialias ? "1" : "0";
    document.documentElement.dataset.gestures = s.gestures ? "1" : "0";
    document.documentElement.dataset.gsens = String(s.gestureSensitivity);
    document.documentElement.dataset.perf = s.showPerfHud ? "1" : "0";
    document.documentElement.dataset.debug = s.debug ? "1" : "0";

    if(document.body) document.body.style.fontSize = String(s.minFontPt) + "pt";
  }

  function saveGlobal(partial){
    const cur = read(KEY_GLOBAL) || {};
    const next = normalize(Object.assign({}, DEFAULTS, cur, partial || {}));
    LS.setItem(KEY_GLOBAL, JSON.stringify(next));
    return next;
  }

  function saveApp(app, partial){
    if(!app) return null;
    const cur = read(KEY_APP(app)) || {};
    const next = normalize(Object.assign({}, cur, partial || {}));
    LS.setItem(KEY_APP(app), JSON.stringify(next));
    return next;
  }

  function clearApp(app){ if(app) LS.removeItem(KEY_APP(app)); }
  function clearGlobal(){ LS.removeItem(KEY_GLOBAL); }

  window.PORTFOLIO_SETTINGS = {
    DEFAULTS, normalize, getAppName, getSettings, applyToDocument,
    saveGlobal, saveApp, clearApp, clearGlobal,
    keys: { KEY_GLOBAL, KEY_APP }
  };

  const app = getAppName();
  const s = getSettings(app);
  applyToDocument(s);
})();
