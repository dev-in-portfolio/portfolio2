// Render Recovery Guard (Phase 2B)
(function () {
  function recoverCanvas(c){
    const rect = c.getBoundingClientRect();
    if (rect.width <= 2 || rect.height <= 2) return; // nothing to size against yet
    if (c.width === 0 || c.height === 0) {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.floor(rect.width * dpr));
      c.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    c.style.display = 'block';
  }

  function scan(){
    document.querySelectorAll('canvas').forEach(recoverCanvas);
    document.querySelectorAll('[data-mount]').forEach(m=>{
      if (m.getBoundingClientRect().height < 10) {
        m.style.minHeight = '200px';
        m.style.display = 'block';
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    scan();
  });
  window.addEventListener('resize', () => setTimeout(scan, 80));
})();