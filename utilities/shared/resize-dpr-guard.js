// Resize + DPR Guard (Phase 2C)
(function () {
  function fixCanvasDPR(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      const ctx2 = canvas.getContext && canvas.getContext('2d');
      if (ctx2 && ctx2.setTransform) ctx2.setTransform(dpr,0,0,dpr,0,0);
      // If the canvas is WebGL, ensure viewport matches DPR-scaled buffer
      const gl = canvas.getContext && (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
      if (gl && gl.viewport) gl.viewport(0, 0, w, h);

    }
  }

  function apply(){
    document.querySelectorAll('canvas').forEach(fixCanvasDPR);
  }

  let t;
  function onResize(){
    clearTimeout(t);
    t = setTimeout(apply, 120);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  window.addEventListener('DOMContentLoaded', apply);
})();