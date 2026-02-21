// quality-hooks.js
// Makes Nexus performance preferences actually change render quality.
//
// What it does:
// - Computes a "quality profile" (renderScale / particleScale / shadow) from NexusPrefs
// - Patches common THREE.WebGLRenderer usage so DPI + shadows respect the profile
// - Exposes window.NexusQuality and fires a "nexus:prefs" event when prefs change
// - Live-updates THREE renderers when the user changes settings (no reload required)
//
// Safe: if NexusPrefs or THREE are missing, it no-ops.

(function (global) {
  "use strict";
  if (!global) return;

  function clamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function getPrefs() {
    try { return global.NexusPrefs && global.NexusPrefs.get ? global.NexusPrefs.get() : null; } catch (_) { return null; }
  }

  function getPerfMode(p) {
    p = p || getPrefs();
    return (p && p.perf) ? p.perf : "balanced";
  }

  function getQuality(p) {
    try {
      if (global.NexusPrefs && global.NexusPrefs.qualityProfile) return global.NexusPrefs.qualityProfile(p || undefined);
    } catch (_) {}
    return { renderScale: 1.0, particleScale: 1.0, shadow: 1 };
  }

  function compute() {
    const prefs = getPrefs() || {};
    const q = getQuality(prefs);
    const out = Object.assign({}, q, { perf: getPerfMode(prefs) });
    return { prefs, quality: out };
  }

  function publish() {
    const { prefs, quality } = compute();
    const rev = (global.__NEXUS_QUALITY_REV || 0) + 1;
    global.__NEXUS_QUALITY_REV = rev;

    global.NexusQuality = Object.assign({}, quality, { __rev: rev });

    try {
      global.dispatchEvent(new CustomEvent("nexus:prefs", { detail: { prefs, quality: global.NexusQuality } }));
    } catch (_) {}
  }

  // THREE patching -----------------------------------------------------------
  function patchTHREE() {
    const THREE = global.THREE;
    if (!THREE || THREE.__NEXUS_QUALITY_PATCHED) return;
    if (!THREE.WebGLRenderer || !THREE.WebGLRenderer.prototype) return;

    THREE.__NEXUS_QUALITY_PATCHED = true;

    const proto = THREE.WebGLRenderer.prototype;
    const origSetPixelRatio = proto.setPixelRatio;
    const origRender = proto.render;

    function scaledPixelRatio(requested) {
      const prefs = getPrefs() || {};
      const q = getQuality(prefs);
      const perf = getPerfMode(prefs);

      let dpr = (requested == null ? (global.devicePixelRatio || 1) : requested);
      dpr = clamp(dpr, 0.75, 3.0);

      let scaled = dpr * clamp(q.renderScale, 0.5, 1.5);

      // Perf caps
      if (perf === "lite") scaled = Math.min(scaled, 1.0);
      else if (perf === "balanced" || perf === "auto") scaled = Math.min(scaled, 1.75);
      else if (perf === "ultra") scaled = Math.min(scaled, 2.5);

      return clamp(scaled, 0.75, 2.5);
    }

    proto.setPixelRatio = function (value) {
      try { return origSetPixelRatio.call(this, scaledPixelRatio(value)); }
      catch (_) { return origSetPixelRatio.call(this, value); }
    };

    // Live-update renderer settings when prefs change (fast: only runs when rev changes)
    proto.render = function (scene, camera) {
      const currentRev = global.__NEXUS_QUALITY_REV || 0;
      if (this.__nexusQualityRev !== currentRev) {
        this.__nexusQualityRev = currentRev;
        try {
          // Re-apply DPR using the current device DPR as a baseline.
          origSetPixelRatio.call(this, scaledPixelRatio(global.devicePixelRatio || 1));
        } catch (_) {}
      }

      // Keep shadows aligned with prefs (best-effort)
      try {
        const q = getQuality(getPrefs() || {});
        if (this.shadowMap) this.shadowMap.enabled = !!q.shadow;
      } catch (_) {}

      return origRender.call(this, scene, camera);
    };

    publish();
  }

  // Init + retry briefly (covers apps that load THREE later)
  publish();
  patchTHREE();
  let tries = 0;
  const t = global.setInterval(function () {
    tries++;
    patchTHREE();
    if ((global.THREE && global.THREE.__NEXUS_QUALITY_PATCHED) || tries > 80) global.clearInterval(t);
  }, 100);

  // Keep in sync -------------------------------------------------------------
  try {
    global.addEventListener("storage", function (e) {
      if (!e) return;
      if (e.key && String(e.key).indexOf("NEXUS_PREFS") !== -1) publish();
    });
  } catch (_) {}

  // Wrap NexusPrefs.set so same-tab changes publish immediately
  try {
    if (global.NexusPrefs && global.NexusPrefs.set && !global.NexusPrefs.__NEXUS_WRAPPED_SET) {
      const _origSet = global.NexusPrefs.set;
      global.NexusPrefs.set = function (partial) {
        const out = _origSet.call(global.NexusPrefs, partial);
        try { publish(); } catch (_) {}
        return out;
      };
      global.NexusPrefs.__NEXUS_WRAPPED_SET = true;
    }
  } catch (_) {}
})(typeof window !== "undefined" ? window : this);
