<script>
(function() {
  const overlay = document.getElementById('nexusBootOverlay');
  const stageEl = document.getElementById('nexusBootStage');
  if (!overlay) return;

  document.body.classList.add('nexus-booting');

  const stages = [
    "Warming up the GPU…",
    "Loading shaders…",
    "Preparing simulation…",
    "Building controls…",
    "Calibrating chaos…",
    "Finalizing scene…"
  ];
  let i = 0;
  const tick = () => {
    if (!stageEl) return;
    stageEl.textContent = stages[i % stages.length];
    i++;
  };
  tick();
  const iv = setInterval(tick, 900);

  const done = () => {
    if (!document.getElementById('nexusBootOverlay')) return;
    clearInterval(iv);
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      overlay.remove();
      document.body.classList.remove('nexus-booting');
    }, 260);
  };

  // Optional: labs may call this when fully ready.
  window.__NEXUS_LAB_READY__ = done;

  // Fallback heuristic: once a canvas exists and is sized, we allow a short grace window, then hide.
  const start = Date.now();
  const maxWait = 15000; // safety valve
  const poll = () => {
    if (Date.now() - start > maxWait) return done();
    const canv = document.querySelector('canvas');
    if (canv && canv.clientWidth > 0 && canv.clientHeight > 0) {
      requestAnimationFrame(() => setTimeout(done, 220));
      return;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);

  // If the lab finishes fast, don't force a long overlay.
  window.addEventListener('load', () => setTimeout(() => {
    // If the canvas never appears, still remove after a while so the user can see any error UI.
    if (Date.now() - start > 2500) done();
  }, 50), { once: true });
})();
</script>
