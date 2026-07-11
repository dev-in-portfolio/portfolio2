(() => {
  'use strict';

  const MODULES = [
    'src/core-hardening.js',
    'src/state.js',
    'src/recovery-guard.js',
    'src/render.js',
    'src/workflows-core.js',
    'src/workflows-finance.js',
    'src/data.js',
    'src/walk-phase-control.js',
    'src/final-integrity.js',
    'src/runtime-hardening.js',
    'src/ui-default-hardening.js'
  ];

  function showFatal(message) {
    console.error(message);
    const region = document.getElementById('toastRegion');
    if (!region) return;
    const notice = document.createElement('div');
    notice.className = 'toast error';
    notice.textContent = message;
    region.appendChild(notice);
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = path;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Runtime module failed to load: ${path}`));
      document.body.appendChild(script);
    });
  }

  async function start() {
    if (!window.AlibiCore) throw new Error('core.js did not initialize.');
    for (const path of MODULES) await loadScript(path);
    if (!window.AlibiApp?.initialize) throw new Error('The Alibi runtime did not initialize completely.');
  }

  start().catch(error => showFatal(`Alibi failed to start: ${error.message}`));
})();
