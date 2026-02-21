// Runtime Load Guard (Phase 2A)
(function () {
  function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    }
  }

  // Global switch: disable splash/boot overlays inside individual apps
  // (Requested: remove splash screens from all individual apps)
  function removeSplashOverlays() {
    try { window.NO_SPLASH = true; } catch (_) {}

    const ids = [
      'nexusBootOverlay',
      'logoSplash',
      'splashOverlay',
      'dsSplash',
      'ds-splash-overlay',
      'bootSplash',
      'helixSplashShell',
      'splash',
      'splash1',
      'splash2',
      'loader'
    ];

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // Class-based fallbacks (in case an overlay isn't ID'd)
    const selectors = [
      '.splash',
      '.splash-backdrop',
      '.boot-splash',
      '.ds-splash-overlay',
      '[data-splash]'
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        try { el.remove(); } catch (_) {}
      });
    }

    // Remove scroll-locking classes used by splash overlays
    if (document.body) {
      document.body.classList.remove('ds-splash-open', 'nexus-booting', 'no-scroll');
      document.documentElement.classList.remove('ds-splash-open', 'nexus-booting', 'no-scroll');
    }
  }

  // Always remove splash overlays at DOMReady
  onReady(removeSplashOverlays);

  // Event hook for apps that want a unified signal
  onReady(() => document.dispatchEvent(new Event('app:domready')));

  // Canvas init helper (buffer layout)
  window.safeInitCanvas = function (fn) {
    onReady(() => requestAnimationFrame(() => requestAnimationFrame(fn)));
  };

  // Run-once helper
  window.__initOnce = window.__initOnce || Object.create(null);
  window.runOnce = function (key, fn) {
    if (window.__initOnce[key]) return;
    window.__initOnce[key] = true;
    fn();
  };
})();
