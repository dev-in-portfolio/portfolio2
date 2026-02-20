// State Init Guard (Phase 2E)
(function(){
  const KEY_PREFIX = 'nexus:';
  const VERSION_KEY = KEY_PREFIX + 'stateVersion';
  const CURRENT = 1;

  function safeJSONParse(s){
    try { return JSON.parse(s); } catch(e){ return null; }
  }

  function getLS(key){
    try { return localStorage.getItem(key); } catch(e){ return null; }
  }
  function setLS(key, val){
    try { localStorage.setItem(key, val); } catch(e){}
  }
  function rmLS(key){
    try { localStorage.removeItem(key); } catch(e){}
  }

  function ensureDefaults(){
    const vRaw = getLS(VERSION_KEY);
    const v = Number(vRaw || 0);
    if (!vRaw) setLS(VERSION_KEY, String(CURRENT));
    if (Number.isNaN(v) || v < 0 || v > 99) {
      rmCorrupt();
      setLS(VERSION_KEY, String(CURRENT));
      return;
    }
    if (v !== CURRENT) {
      // Minimal migration: bump version without breaking unknown schemas
      setLS(VERSION_KEY, String(CURRENT));
    }
  }

  function rmCorrupt(){
    // Only remove keys we own
    Object.keys(localStorage || {}).forEach(k=>{
      if (k && k.startsWith(KEY_PREFIX)) rmLS(k);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    try {
      ensureDefaults();
    } catch(e){
      // If localStorage is blocked or corrupt, fail safe (no crash)
    }

    // === NO-SPLASH (Jan 2026)
    // Request: remove splash / boot overlays from all *individual apps*.
    // Centralized here so every app inherits the behavior.
    try {
      const killIds = [
        'logoSplash',
        'splash', 'splash1', 'splash2',
        'bootSplash', 'bootOverlay',
        'loadingOverlay', 'loading',
        'dsSplash', 'dsSplashRoot',
        'intro', 'introOverlay',
        'preloader', 'preload',
        'startupOverlay',
      ];

      const killSelectors = [
        '.splash', '.splash-overlay',
        '.bootSplash', '.boot-overlay',
        '.loadingOverlay', '.loading-overlay',
        '.preloader', '.preload',
        '.intro', '.introOverlay',
        '.ds-splash-root', '.ds-splash-overlay',
        '[data-splash]',
      ];

      killIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      killSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      });

      // Restore scroll / pointer behavior if a splash previously locked it.
      document.documentElement.classList.remove('splash-open', 'ds-splash-open', 'no-scroll');
      document.body && document.body.classList && document.body.classList.remove('splash-open', 'ds-splash-open', 'no-scroll');
      if (document.documentElement) document.documentElement.style.overflow = '';
      if (document.body) {
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
      }
    } catch(_e){
      // never block rendering
    }
  });
})();