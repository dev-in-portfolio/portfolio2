// Scroll & Focus Guard (Phase 1F)
(function () {
  function unlockScrollZones() {
    // Only unlock known problematic patterns, avoid nuking intentional overflow containers
    document.querySelectorAll('[data-scroll-lock], .scroll-lock, .no-scroll, .lock-scroll').forEach(el=>{
      el.style.overflow = 'auto';
      el.style.touchAction = 'auto';
      el.style.webkitOverflowScrolling = 'touch';
    });
  }

  function fixTabOrder() {
    document.querySelectorAll('[tabindex="-1"]').forEach(el=>{
      if (!el.hasAttribute('data-allow-negative-tabindex')) el.removeAttribute('tabindex');
    });
  }

  function ensureMainTarget() {
    // Provide a stable focus target for skip-links (#main)
    let main = document.getElementById('main');
    if (!main) {
      const candidate = document.querySelector('main') || document.querySelector('[role="main"]');
      if (candidate) candidate.id = 'main';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    ensureMainTarget();
    unlockScrollZones();
    fixTabOrder();
  });
})();