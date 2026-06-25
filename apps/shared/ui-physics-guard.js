// UI Physics Guard (v2)
// - Computes --safe-top for sticky headers
// - Prevents invisible/transparent overlays from eating taps on mobile

(function(){
  function px(n){ return (Math.max(0, Math.floor(n)) + 'px'); }

  function computeSafeTop(){
    const bars = document.querySelectorAll('.nexus-bar, header, .header, .topbar, .nav, .navbar');
    let maxH = 0;
    bars.forEach(b => {
      const cs = getComputedStyle(b);
      if (cs.position === 'sticky' || cs.position === 'fixed') {
        maxH = Math.max(maxH, b.getBoundingClientRect().height || b.offsetHeight || 0);
      }
    });
    document.documentElement.style.setProperty('--safe-top', px(maxH));
  }

  function parseRGBAAlpha(bg){
    try{
      const m = (bg || '').match(/rgba?\(([^)]+)\)/i);
      if (!m) return 1;
      const parts = m[1].split(',').map(s => parseFloat(s.trim()));
      if (parts.length < 4) return 1;
      return Number.isFinite(parts[3]) ? parts[3] : 1;
    }catch(_){
      return 1;
    }
  }

  function deRogueCapture(){
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    const isProtected = (el) => {
      const id = (el.id || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();

      // Known safe UI / intentional overlays
      if (id.includes('nx-error') || cls.includes('nx-error')) return true;
      if (id.includes('splash') || cls.includes('splash')) return true;
      if (id.includes('modal') || cls.includes('modal')) return true;
      if (id.includes('dialog') || cls.includes('dialog')) return true;
      if (id.includes('tooltip') || cls.includes('tooltip')) return true;
      if (id.includes('toast') || cls.includes('toast')) return true;
      if (id.includes('leaflet') || cls.includes('leaflet')) return true;

      // ARIA dialog patterns
      if (el.getAttribute('role') === 'dialog') return true;
      if (el.getAttribute('aria-modal') === 'true') return true;

      // Canvas and iframe are typically legitimate capture surfaces
      if (el.tagName === 'CANVAS' || el.tagName === 'IFRAME') return true;

      return false;
    };

    const hasInteractiveChildren = (el) => {
      try{
        return !!el.querySelector('a,button,input,select,textarea,[role="button"],[onclick]');
      }catch(_){ return false; }
    };

    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === 'none') return;
      if (isProtected(el)) return;

      // 1) Original rule: invisible + high z-index
      const zi = parseInt(cs.zIndex, 10);
      const zHigh = Number.isFinite(zi) && zi >= 600;
      const invisible = cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05;
      if (zHigh && invisible) {
        el.style.pointerEvents = 'none';
        el.setAttribute('data-nx-pointerfix', '1');
        return;
      }

      // 2) Phantom blockers: large, transparent overlays (even at modest z)
      const pos = cs.position;
      if (!(pos === 'fixed' || pos === 'sticky' || pos === 'absolute')) return;
      if (hasInteractiveChildren(el)) return;

      const r = el.getBoundingClientRect();
      const coversScreen = (r.width >= 0.65 * vw) && (r.height >= 0.65 * vh);
      if (!coversScreen) return;

      const bgAlpha = parseRGBAAlpha(cs.backgroundColor);
      const nearlyTransparent = (parseFloat(cs.opacity) < 0.12) || (bgAlpha < 0.08);
      if (!nearlyTransparent) return;

      // Avoid disabling actual layout containers
      const hasText = (el.textContent || '').trim().length > 0;
      if (hasText) return;

      el.style.pointerEvents = 'none';
      el.setAttribute('data-nx-pointerfix', '1');
    });
  }

  function run(){
    computeSafeTop();
    deRogueCapture();
  }

  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('resize', run);
  window.addEventListener('orientationchange', run);
})();
