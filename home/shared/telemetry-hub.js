// telemetry-hub.js
// Tiny shared telemetry helper for all your single-file apps.
//
// Include with:
//   <script src="telemetry-hub.js"></script>
//
// In an app, instead of writing your own logEvent, you can do:
//   TelemetryHub.log("abyss", "AI", "Ocean Guide Advisor used.");
//   TelemetryHub.log("dark-oxygen-lab", "SIM", "Intensity slider moved.");
//
// It writes to console AND keeps a small rolling buffer in localStorage
// under the key TELEMETRY_HUB_LOG so you can inspect recent actions.

(function (global) {
  if (!global) return;

  const STORAGE_KEY = "TELEMETRY_HUB_LOG";
  const MAX_ENTRIES = 300;

  function loadLog() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }

  function saveLog(entries) {
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      // ignore quota / private mode issues
    }
  }

  function log(appId, category, message, extra) {
    const now = new Date();
    const entry = {
      ts: now.toISOString(),
      appId: appId || "unknown",
      category: category || "INFO",
      message: message || "",
      extra: extra || null
    };

    // Console for live debugging.
    const tag = "[TelemetryHub][" + entry.appId + "][" + entry.category + "]";
    if (console && console.log) {
      console.log(tag, entry.message, entry.extra ? entry.extra : "");
    }

    // Local storage ring buffer.
    const entries = loadLog();
    entries.push(entry);
    while (entries.length > MAX_ENTRIES) entries.shift();
    saveLog(entries);
  }

  function getRecent(limit) {
    const entries = loadLog();
    if (!limit || limit >= entries.length) return entries.slice().reverse();
    return entries.slice(-limit).reverse();
  }

  function clear() {
    saveLog([]);
  }

  const TelemetryHub = { log, getRecent, clear };

  global.TelemetryHub = TelemetryHub;
})(typeof window !== "undefined" ? window : this);


// ===== Telemetry Hardening (V1) =====
(function(){
  const g = (typeof window !== "undefined") ? window : globalThis;
  const TH = g.TelemetryHub = g.TelemetryHub || {};
  const onceKey = "__DS_TELEMETRY_ONCE__";
  g[onceKey] = g[onceKey] || Object.create(null);

  function once(k, fn){
    try{
      if (g[onceKey][k]) return;
      g[onceKey][k] = true;
      fn();
    }catch(_){}
  }

  function safeLS(){
    try{ return g.localStorage; }catch(_){ return null; }
  }

  TH.capture = TH.capture || function(type, payload){
    try{
      // Minimal, safe capture; preserve existing behavior if present
      const ls = safeLS();
      if (ls){
        const key = "ds_telemetry_buffer_v1";
        const raw = ls.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({t: Date.now(), type, payload});
        while (arr.length > 200) arr.shift();
        ls.setItem(key, JSON.stringify(arr));
      }
    }catch(_){}
    try{ console.debug && console.debug("[telemetry]", type, payload); }catch(_){}
  };

  TH.attachGlobalHandlersOnce = function(meta){
    const appId = meta?.appId || "app";
    const appName = meta?.appName || "App";
    once("globalHandlers:"+appId, ()=>{
      try{
        g.addEventListener("error", (e)=>{
          try{
            const msg = e?.message || e?.error?.message || "Unhandled error";
            TH.capture("error", {appId, appName, msg, source: e?.filename, line: e?.lineno, col: e?.colno});
          }catch(_){}
        });
        g.addEventListener("unhandledrejection", (e)=>{
          try{
            const r = e?.reason;
            const msg = (r && (r.message || String(r))) || "Unhandled rejection";
            TH.capture("unhandledrejection", {appId, appName, msg});
          }catch(_){}
        });
      }catch(_){}
    });
  };

  // Auto-attach generic handlers once (no meta)
  once("auto", ()=> TH.attachGlobalHandlersOnce({appId:"global", appName:"Portfolio"}));
})();
 // ===== /Telemetry Hardening =====
