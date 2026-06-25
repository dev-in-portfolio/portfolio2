// ui-helpers.js
// Small shared UI primitives (toasts, modal, theme toggle) for all apps.
//
// Include with:
//   <script src="ui-helpers.js"></script>
//
// Usage examples:
//   UIHelpers.toast("Saved current route.", { tone: "ok" });
//   UIHelpers.setTheme("dark"); // or "light"
//   UIHelpers.openModal({ title, body, primaryLabel, onPrimary, secondaryLabel, onSecondary });
//
(function (global) {
  if (!global) return;
  if (global.UIHelpers && typeof global.UIHelpers.toast === "function") return;

  if (!global) return;

  const doc = global.document;
  if (!doc) return;

  const UIHelpers = {};

  // --- Toasts ---------------------------------------------------------------

  let toastContainer = null;

  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    const el = doc.createElement("div");
    el.id = "ui-helpers-toast-container";
    el.style.position = "fixed";
    el.style.zIndex = "9999";
    el.style.left = "50%";
    el.style.bottom = "16px";
    el.style.transform = "translateX(-50%)";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.gap = "6px";
    el.style.pointerEvents = "none";
    doc.body.appendChild(el);
    toastContainer = el;
    return el;
  }

  UIHelpers.toast = function toast(message, options) {
    options = options || {};
    const tone = options.tone || "info"; // "info" | "ok" | "warn" | "error"
    const duration = options.duration || 2600;

    const container = ensureToastContainer();
    const card = doc.createElement("div");
    card.style.pointerEvents = "auto";
    card.style.minWidth = "220px";
    card.style.maxWidth = "360px";
    card.style.padding = "8px 12px";
    card.style.borderRadius = "999px";
    card.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    card.style.fontSize = "12px";
    card.style.display = "flex";
    card.style.alignItems = "center";
    card.style.justifyContent = "center";
    card.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.8)";
    card.style.border = "1px solid rgba(148, 163, 184, 0.5)";
    card.style.backdropFilter = "blur(18px)";
    card.style.color = "#e5e7eb";

    let bg = "rgba(15, 23, 42, 0.94)";
    if (tone === "ok") bg = "linear-gradient(135deg, rgba(22, 163, 74, 0.9), rgba(15, 23, 42, 0.98))";
    else if (tone === "warn") bg = "linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(15, 23, 42, 0.98))";
    else if (tone === "error") bg = "linear-gradient(135deg, rgba(248, 113, 113, 0.93), rgba(15, 23, 42, 0.98))";

    card.style.background = bg;
    card.textContent = message || "";

    container.appendChild(card);

    setTimeout(() => {
      card.style.opacity = "0";
      card.style.transform = "translateY(4px)";
      card.style.transition = "opacity 220ms ease-out, transform 220ms ease-out";
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 230);
    }, duration);
  };

  // --- Theme toggle ---------------------------------------------------------

  UIHelpers.setTheme = function setTheme(mode) {
    const body = doc.body;
    if (!body) return;
    body.dataset.theme = mode || "dark";
  };

  // --- Simple modal ---------------------------------------------------------

  let modalOverlay = null;

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove("ui-helpers-modal-visible");
    setTimeout(() => {
      if (modalOverlay && modalOverlay.parentNode) {
        modalOverlay.parentNode.removeChild(modalOverlay);
      }
      modalOverlay = null;
    }, 160);
  }

  UIHelpers.openModal = function openModal(config) {
    const cfg = config || {};
    if (modalOverlay) closeModal();

    modalOverlay = doc.createElement("div");
    modalOverlay.style.position = "fixed";
    modalOverlay.style.inset = "0";
    modalOverlay.style.zIndex = "9998";
    modalOverlay.style.display = "flex";
    modalOverlay.style.alignItems = "center";
    modalOverlay.style.justifyContent = "center";
    modalOverlay.style.background = "rgba(15, 23, 42, 0.75)";
    modalOverlay.style.backdropFilter = "blur(10px)";
    modalOverlay.style.opacity = "0";
    modalOverlay.style.transition = "opacity 160ms ease-out";

    const card = doc.createElement("div");
    card.style.minWidth = "260px";
    card.style.maxWidth = "420px";
    card.style.borderRadius = "16px";
    card.style.padding = "12px 14px 10px";
    card.style.background = "rgba(15, 23, 42, 0.98)";
    card.style.border = "1px solid rgba(148, 163, 184, 0.6)";
    card.style.boxShadow = "0 22px 50px rgba(15, 23, 42, 0.9)";
    card.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    card.style.color = "#e5e7eb";
    card.style.fontSize = "13px";

    const titleEl = doc.createElement("div");
    titleEl.textContent = cfg.title || "Notice";
    titleEl.style.fontWeight = "600";
    titleEl.style.marginBottom = "6px";
    titleEl.style.fontSize = "13px";

    const bodyEl = doc.createElement("div");
    if (typeof cfg.body === "string") {
      bodyEl.textContent = cfg.body;
    } else if (cfg.body instanceof Node) {
      bodyEl.appendChild(cfg.body);
    } else {
      bodyEl.textContent = "";
    }
    bodyEl.style.fontSize = "12px";
    bodyEl.style.color = "#cbd5f5";
    bodyEl.style.marginBottom = "10px";

    const footer = doc.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";
    footer.style.gap = "6px";

    const secondaryLabel = cfg.secondaryLabel || "Cancel";
    const primaryLabel = cfg.primaryLabel || "OK";

    if (cfg.secondaryLabel !== null) {
      const secondary = doc.createElement("button");
      secondary.type = "button";
      secondary.textContent = secondaryLabel;
      secondary.style.fontSize = "11px";
      secondary.style.padding = "5px 10px";
      secondary.style.borderRadius = "999px";
      secondary.style.border = "1px solid rgba(148, 163, 184, 0.7)";
      secondary.style.background = "rgba(15, 23, 42, 0.96)";
      secondary.style.color = "#e5e7eb";
      secondary.style.cursor = "pointer";
      secondary.addEventListener("click", () => {
        if (typeof cfg.onSecondary === "function") cfg.onSecondary();
        closeModal();
      });
      footer.appendChild(secondary);
    }

    const primary = doc.createElement("button");
    primary.type = "button";
    primary.textContent = primaryLabel;
    primary.style.fontSize = "11px";
    primary.style.padding = "5px 11px";
    primary.style.borderRadius = "999px";
    primary.style.border = "1px solid rgba(56, 189, 248, 0.9)";
    primary.style.background = "linear-gradient(135deg, rgba(56, 189, 248, 0.92), rgba(37, 99, 235, 0.96))";
    primary.style.color = "#0b1120";
    primary.style.cursor = "pointer";
    primary.addEventListener("click", () => {
      if (typeof cfg.onPrimary === "function") cfg.onPrimary();
      closeModal();
    });

    footer.appendChild(primary);

    card.appendChild(titleEl);
    card.appendChild(bodyEl);
    card.appendChild(footer);
    modalOverlay.appendChild(card);
    doc.body.appendChild(modalOverlay);

    requestAnimationFrame(() => {
      modalOverlay.style.opacity = "1";
    });

    if (cfg.dismissOnBackdrop !== false) {
      modalOverlay.addEventListener("click", (ev) => {
        if (ev.target === modalOverlay) {
          if (typeof cfg.onSecondary === "function") cfg.onSecondary();
          closeModal();
        }
      });
    }
  };

  

  function __slugifyTitle(str) {
    try {
      return String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    } catch (e) {
      return "app";
    }
  }

  function getAppId() {
    return (global.APP_ID && String(global.APP_ID)) || __slugifyTitle(document && document.title);
  }

  const ASSISTANT_PROFILES = {
    "aeon-quantum-warp-hero-cams-x-ray-hud": { title: "AI FLIGHT DIRECTOR", tagline: "Cameras • timing • HUD choreography" },"helios-solar-dynamics": { title: "AI SOLAR OPS ADVISOR", tagline: "Signals • panels • interpretation" },
    "helix-live-protein-lab": { title: "AI STRUCTURE GUIDE", tagline: "Model view • overlays • interpretation" },
    "magma-omega-enter-magma-chamber": { title: "AI VOLCANIC SYSTEMS ADVISOR", tagline: "Performance • shaders • flow tuning" },
    "string-theory-4d-manifold-lab": { title: "AI FIELD THEORIST", tagline: "Manifold intuition • controls • experiments" },
    "tectonic-satellite-global-seismic-monitor": { title: "AI SEISMIC OPS ANALYST", tagline: "Maps • signals • event reading" },
    "transit-3d-prestige-edition": { title: "AI ROUTE OPS PLANNER", tagline: "State • navigation • edge cases" },
    "vortex-v3-3-multi-asset-vortex-field": { title: "AI VORTEX FIELD ADVISOR", tagline: "Assets • modes • diagnostics" }
  };

  function getAssistantProfile() {
    const appId = getAppId();
    const base = ASSISTANT_PROFILES[appId] || { title: "AI ADVISOR", tagline: "Assistant online" };
    return {
      appId,
      title: (global.APP_AI_TITLE && String(global.APP_AI_TITLE)) || base.title,
      tagline: (global.APP_AI_TAGLINE && String(global.APP_AI_TAGLINE)) || base.tagline
    };
  }

  function applyAssistantLabels() {
    try {
      if (typeof document === "undefined") return;
      const prof = getAssistantProfile();

      // Vortex-style: first row in AI panel header
      const vortexHead = document.querySelector(".ai-panel .panel-head > div:first-child");
      if (vortexHead && /AI\s+ADVIS/i.test(vortexHead.textContent || "")) {
        vortexHead.textContent = prof.title + " // " + (document.title || "");
      }

      // Magma-style: <section aria-label="AI Advisors"> .panel-h b
      const panelHBold = document.querySelector('section[aria-label="AI Advisors"] .panel-h b');
      if (panelHBold && /AI\s+Advis/i.test(panelHBold.textContent || "")) {
        panelHBold.textContent = prof.title;
      }

      // Generic literal headings
      const literal = Array.from(document.querySelectorAll("b,h2,h3,h4,div,span")).find(el => {
        const t = (el.textContent || "").trim();
        return t === "AI Advisor" || t === "AI Advisors" || t === "AI ADVISOR" || t === "AI ADVISORS";
      });
      if (literal) literal.textContent = prof.title;
    } catch (e) {}
  }


  UIHelpers.getAssistantProfile = getAssistantProfile;
  UIHelpers.applyAssistantLabels = applyAssistantLabels;
  try { applyAssistantLabels(); } catch(e) {}

  global.UIHelpers = UIHelpers;
})(typeof window !== "undefined" ? window : this);

/* ==== UIHelpers: 404 Overlay (Synthwave) ==== */
(function(){
  if (!window.UIHelpers) window.UIHelpers = {};
  const U = window.UIHelpers;

  function ensureOverlay(){
    let el = document.getElementById("ds-404-overlay");
    if (el) return el;

    el = document.createElement("div");
    el.id = "ds-404-overlay";
    el.setAttribute("aria-hidden", "true");
    // Mobile hardening: some browsers treat fixed elements oddly when the URL bar / visual
    // viewport is changing, which can look like the overlay is sliding off-screen.
    // We pin the overlay to the visualViewport when available.
    el.style.cssText = [
      "position:fixed",
      "inset:0",
      "top:0",
      "left:0",
      "width:100%",
      "height:var(--svhpx, 100dvh)",
      "max-width:100%",
      "max-height:var(--svhpx, 100dvh)",
      "margin:0",
      "padding:0",
      "z-index:99999",
      "display:none",
      "overflow:hidden",
      "touch-action:none",
      "overscroll-behavior:none"
    ].join(";");

    const bg = document.createElement("div");
    bg.id = "ds-404-bg";
    bg.style.cssText = [
      "position:absolute",
      "inset:0",
      "background-position:center",
      "background-size:cover",
      "background-repeat:no-repeat",
      "filter:saturate(1.1) contrast(1.05)"
    ].join(";");
    el.appendChild(bg);

    const fx = document.createElement("div");
    fx.id = "ds-404-fx";
    fx.style.cssText = [
      "position:absolute",
      "inset:0",
      "background:"
        + "linear-gradient(180deg, rgba(0,0,0,0.60), rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.72)),"
        + "radial-gradient(circle at 40% 40%, rgba(255,0,200,0.20), rgba(0,255,255,0.10) 45%, rgba(0,0,0,0.0) 70%),"
        + "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 64px),"
        + "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 64px)",
      "mix-blend-mode:screen"
    ].join(";");
    el.appendChild(fx);

    const content = document.createElement("div");
    content.id = "ds-404-content";
    content.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px"
    ].join(";");
    content.innerHTML = `
      <div style="
        max-width:820px;
        width:100%;
        text-align:center;
        color:#fff;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif;
      ">
        <div id="ds-404-code" style="
          font-size:clamp(64px, 10vw, 140px);
          font-weight:800;
          letter-spacing:0.06em;
          text-transform:uppercase;
          text-shadow:
            0 0 12px rgba(255, 0, 200, 0.55),
            0 0 22px rgba(0, 255, 255, 0.35);
        ">404</div>
        <div id="ds-404-title" style="
          margin-top:8px;
          font-size:clamp(18px, 2.4vw, 28px);
          font-weight:650;
          letter-spacing:0.03em;
          opacity:0.95;
        ">NOT FOUND</div>
        <div id="ds-404-sub" style="
          margin-top:10px;
          font-size:clamp(14px, 1.6vw, 16px);
          opacity:0.85;
          line-height:1.45;
        ">The requested view doesn’t exist in this lab build. Press <b>Esc</b> to return.</div>
      </div>
    `;
    el.appendChild(content);

    // Install hardening CSS once. This only activates while the 404 is open.
    // It prevents body/html transforms from turning `position:fixed` into a
    // transformed containing-block anchored overlay.
    try{
      const STYLE_ID = "ds-404-hardening-style";
      if (!document.getElementById(STYLE_ID)){
        const st = document.createElement("style");
        st.id = STYLE_ID;
        st.textContent = `
          html.ds-404-open, html.ds-404-open body { transform: none !important; }
          html.ds-404-open body { perspective: none !important; }
        `;
        (document.head || document.documentElement).appendChild(st);
      }
    }catch(_){ /* noop */ }

    // Append to <html> instead of <body>. Some apps apply CSS transforms to <body>
    // (or wrap content in transformed containers), which can cause `position:fixed`
    // children of <body> to behave like `position:absolute` ("sliding" on mobile).
    // Attaching to documentElement avoids that containing-block trap.
    (document.documentElement || document.body).appendChild(el);
    return el;
  }

  // Keep fixed overlays truly pinned on mobile when the visual viewport changes (URL bar,
  // keyboard, etc.). Without this, some devices can render fixed layers relative to a shifting
  // layout viewport and the overlay appears to "slide".
  function syncOverlayViewport(el){
    try{
      // Hard-pin overlays to the *layout* viewport.
      // Using visualViewport sizes/offsets is brittle on mobile because the
      // URL-bar/toolbar animation can change vv.height and/or offsets mid-frame,
      // which makes fixed overlays appear to "slide" or end up narrower than the
      // app shell. Keep overlays kiosk-stable.
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.left = "0";
      el.style.right = "0";
      el.style.bottom = "0";
      el.style.transform = "none";
      el.style.width = "100%";
      // Prefer dynamic viewport when available, but never smaller than 100vh.
      el.style.height = "var(--svhpx, 100dvh)";
    }catch(_){ /* noop */ }
  }


  U.init404 = function init404(opts){
    try{
      const o = opts || {};
      const el = ensureOverlay();
      const bg = el.querySelector("#ds-404-bg");
      const title = el.querySelector("#ds-404-title");
      const sub = el.querySelector("#ds-404-sub");

      el.dataset.appId = o.appId || el.dataset.appId || "";
      el.dataset.appName = o.appName || el.dataset.appName || "";
      el.dataset.imageUrl = o.imageUrl || el.dataset.imageUrl || "";

      if (o.imageUrl && bg) bg.style.backgroundImage = `url("${o.imageUrl}")`;
      if (title && o.appName) title.textContent = `${o.appName} — NOT FOUND`;
      if (sub && o.hint) sub.innerHTML = o.hint;

      if (!el.dataset.hashHooked){
        el.dataset.hashHooked = "1";
        const check = ()=>{
          if (location.hash && location.hash.toLowerCase() === "#404") U.show404();
        };
        window.addEventListener("hashchange", check);
        // When the mobile browser UI changes (URL bar collapse, keyboard, rotation), keep
        // the overlay pinned so it doesn't drift.
        try{
          const vv = window.visualViewport;
          if (vv && !el.dataset.vvHooked){
            el.dataset.vvHooked = "1";
            const onVV = ()=>{
              if (el.style.display === "block") syncOverlayViewport(el);
            };
            vv.addEventListener("resize", onVV);
            vv.addEventListener("scroll", onVV);
            window.addEventListener("resize", onVV);
            window.addEventListener("orientationchange", onVV);
          }
        }catch(_){/* ignore */}
        window.addEventListener("keydown", (e)=>{
          if (e.key === "Escape") U.hide404();
        });
        check();
      }
      return el;
    }catch(_){ return null; }
  };

  U.show404 = function show404(opts){
    const el = ensureOverlay();
    const bg = el.querySelector("#ds-404-bg");
    const title = el.querySelector("#ds-404-title");

    const o = opts || {};
    const appName = o.appName || el.dataset.appName || "";
    const img = o.imageUrl || el.dataset.imageUrl || "";

    if (img && bg) bg.style.backgroundImage = `url("${img}")`;
    if (title){
      title.textContent = appName ? `${appName} — NOT FOUND` : "NOT FOUND";
    }

    // Defensive hardening: disable transforms on <html>/<body> while the overlay is open.
    // Transforms can change the containing block for fixed elements in some browsers.
    // (We inject a tiny CSS rule once, and toggle a class while open.)
    try{ document.documentElement.classList.add('ds-404-open'); }catch(_){ }
    try{ document.body && document.body.classList.add('ds-404-open'); }catch(_){ }

    // Pin overlay to the current visual viewport before showing.
    syncOverlayViewport(el);
    el.style.display = "block";
    el.setAttribute("aria-hidden","false");
    try{ document.documentElement.style.overflow = "hidden"; }catch(_){}
    try{ document.body.style.overflow = "hidden"; }catch(_){}
  };

  U.hide404 = function hide404(){
    const el = document.getElementById("ds-404-overlay");
    if (!el) return;
    el.style.display = "none";
    el.setAttribute("aria-hidden","true");
    try{ document.documentElement.classList.remove('ds-404-open'); }catch(_){ }
    try{ document.body && document.body.classList.remove('ds-404-open'); }catch(_){ }
    try{ document.documentElement.style.overflow = ""; }catch(_){}
    try{ document.body.style.overflow = ""; }catch(_){}
    try{
      if (location.hash && location.hash.toLowerCase() === "#404") history.replaceState(null,"",location.pathname + location.search);
    }catch(_){}
  };

  // ===== Easter Eggs (code-only triggers; no UI changes unless activated) =====
  const _EGG_STYLE_ID = "ds-egg-style-v1";
  function _ensureEggStyle(){
    const doc = global.document;
    if (!doc) return;
    if (doc.getElementById(_EGG_STYLE_ID)) return;
    const st = doc.createElement("style");
    st.id = _EGG_STYLE_ID;
    st.textContent = `
      .ds-egg-flash{
        position:fixed; inset:0; z-index:2147483000;
        pointer-events:none;
        background: radial-gradient(circle at 50% 50%, rgba(0,255,255,0.10), rgba(255,0,200,0.08), rgba(0,0,0,0.0));
        opacity:0; transition: opacity 180ms ease;
      }
      .ds-egg-flash.on{ opacity:1; }
      .ds-egg-badge{
        position:fixed; left:16px; bottom:16px; z-index:2147483001;
        padding:10px 12px; border-radius:12px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial;
        font-weight:700; letter-spacing:0.04em;
        background: rgba(0,0,0,0.55);
        border: 1px solid rgba(255,255,255,0.18);
        color: rgba(255,255,255,0.92);
        box-shadow: 0 10px 30px rgba(0,0,0,0.45);
        backdrop-filter: blur(10px);
        transform: translateY(10px);
        opacity:0; transition: all 220ms ease;
        pointer-events:none;
      }
      .ds-egg-badge.on{ opacity:1; transform: translateY(0); }
      .ds-egg-chrome{
        filter: saturate(1.15) contrast(1.05);
      }
      .ds-egg-emoji{
        position:fixed; z-index:2147483002; pointer-events:none;
        will-change: transform, opacity;
        font-size: 18px; opacity: 0.95;
        text-shadow: 0 8px 22px rgba(0,0,0,0.35);
      }
    `;
    doc.head.appendChild(st);
  }

  function _eggFlash(){
    const doc = global.document; if (!doc) return;
    _ensureEggStyle();
    let flash = doc.querySelector(".ds-egg-flash");
    if (!flash){
      flash = doc.createElement("div");
      flash.className = "ds-egg-flash";
      doc.body.appendChild(flash);
    }
    flash.classList.add("on");
    setTimeout(()=>flash.classList.remove("on"), 520);
  }

  function _eggBadge(text){
    const doc = global.document; if (!doc) return;
    _ensureEggStyle();
    let el = doc.querySelector(".ds-egg-badge");
    if (!el){
      el = doc.createElement("div");
      el.className = "ds-egg-badge";
      doc.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("on");
    setTimeout(()=>el.classList.remove("on"), 2200);
  }

  function _emojiBurst(emoji="🐿️", count=18){
    const doc = global.document; if (!doc) return;
    _ensureEggStyle();
    const W = global.innerWidth || 800;
    const H = global.innerHeight || 600;
    for (let i=0;i<count;i++){
      const e = doc.createElement("div");
      e.className = "ds-egg-emoji";
      e.textContent = emoji;
      const x0 = Math.random() * (W*0.6) + W*0.2;
      const y0 = Math.random() * (H*0.3) + H*0.55;
      const dx = (Math.random() - 0.5) * 260;
      const dy = -(Math.random() * 320 + 120);
      const rot = (Math.random() - 0.5) * 420;
      const dur = Math.random() * 700 + 900;
      e.style.left = x0 + "px";
      e.style.top = y0 + "px";
      doc.body.appendChild(e);
      const t0 = performance.now();
      function step(t){
        const k = Math.min(1, (t - t0)/dur);
        const ease = 1 - Math.pow(1-k, 3);
        const x = x0 + dx*ease;
        const y = y0 + dy*ease + (k*k)*220;
        e.style.transform = `translate(${x-x0}px, ${y-y0}px) rotate(${rot*ease}deg) scale(${1 - 0.15*k})`;
        e.style.opacity = String(1 - k);
        if (k < 1) requestAnimationFrame(step);
        else e.remove();
      }
      requestAnimationFrame(step);
    }
  }

  function _normalizeKey(k){
    if (!k) return "";
    // Normalize arrows to words
    const m = {
      "ArrowUp":"UP","ArrowDown":"DOWN","ArrowLeft":"LEFT","ArrowRight":"RIGHT",
      " ":"SPACE","Escape":"ESC"
    };
    if (m[k]) return m[k];
    if (k.length === 1) return k.toUpperCase();
    return k.toUpperCase();
  }

  function _makeSequenceMatcher(seqTokens){
    const seq = seqTokens.map(t=>String(t).toUpperCase());
    const max = seq.length;
    const buf = [];
    return function push(token){
      buf.push(token);
      while (buf.length > max) buf.shift();
      if (buf.length !== max) return false;
      for (let i=0;i<max;i++){
        if (buf[i] !== seq[i]) return false;
      }
      return true;
    };
  }

  function _typedWordMatcher(word){
    const W = String(word).toUpperCase();
    let buf = "";
    const max = Math.max(12, W.length + 4);
    return function pushChar(ch){
      buf = (buf + ch).slice(-max);
      return buf.endsWith(W);
    };
  }

  function _loadUnlocked(appId){
    try{
      const raw = global.localStorage?.getItem(`ds_eggs_unlocked_${appId}`);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    }catch(_){ return {}; }
  }
  function _saveUnlocked(appId, obj){
    try{ global.localStorage?.setItem(`ds_eggs_unlocked_${appId}`, JSON.stringify(obj)); }catch(_){}
  }

  UIHelpers.initEasterEggs = function initEasterEggs(opts){
    try{
      const doc = global.document;
      if (!doc) return;
      _ensureEggStyle();

      const appId = opts?.appId || "app";
      const appName = opts?.appName || "App";
      const eggs = Array.isArray(opts?.eggs) ? opts.eggs : [];
      if (!eggs.length) return;

      const unlocked = _loadUnlocked(appId);
      const once = new Set();

      // Build matchers
      const matchers = [];
      for (const egg of eggs){
        const id = egg.id;
        if (!id) continue;
        const trig = egg.trigger || {};
        if (trig.type === "konami"){
          const seq = ["UP","UP","DOWN","DOWN","LEFT","RIGHT","LEFT","RIGHT","B","A"];
          const m = _makeSequenceMatcher(seq);
          matchers.push({id, egg, mode:"seq", push:(t)=>m(t)});
        } else if (trig.type === "sequence"){
          const seq = (trig.sequence || []).map(_normalizeKey);
          const m = _makeSequenceMatcher(seq);
          matchers.push({id, egg, mode:"seq", push:(t)=>m(t)});
        } else if (trig.type === "typed"){
          const w = trig.word || "";
          const m = _typedWordMatcher(w);
          matchers.push({id, egg, mode:"typed", push:(t)=>m(t)});
        } else if (trig.type === "tripleclick"){
          matchers.push({id, egg, mode:"tripleclick"});
        }
      }

      // Triple-click detector (global, but only fires for eggs that request it)
      let clickTimes = [];
      doc.addEventListener("click", (e)=>{
        const t = performance.now();
        clickTimes.push(t);
        clickTimes = clickTimes.filter(x=>t-x < 650);
        if (clickTimes.length >= 3){
          for (const m of matchers){
            if (m.mode === "tripleclick") _fireEgg(m.egg);
          }
          clickTimes = [];
        }
      }, {passive:true, capture:true});

      function _fireEgg(egg){
        const id = egg.id;
        if (!id) return;
        if (once.has(id)) return;
        once.add(id);

        unlocked[id] = {at: Date.now(), name: egg.name || id};
        _saveUnlocked(appId, unlocked);

        // Default action set
        const act = egg.action || {};
        const title = egg.name ? `${egg.name}` : "Easter Egg";
        const line = egg.message || "🐿️ Secret unlocked.";
        if (UIHelpers.toast) UIHelpers.toast(`${line}`);
        _eggFlash();
        _eggBadge(`${appName}: ${title}`);

        if (act.chrome){
          doc.body.classList.add("ds-egg-chrome");
          setTimeout(()=>doc.body.classList.remove("ds-egg-chrome"), act.chromeMs || 4500);
        }
        if (act.emoji){
          _emojiBurst(act.emoji, act.emojiCount || 18);
        }
        if (act.console){
          try{ console.log(act.console); }catch(_){}
        }
        if (act.run && typeof act.run === "function"){
          try{ act.run(); }catch(_){}
        }
      }

      // Keydown + typed word capture
      doc.addEventListener("keydown", (e)=>{
        const token = _normalizeKey(e.key);
        for (const m of matchers){
          if (m.mode === "seq"){
            if (m.push(token)) _fireEgg(m.egg);
          } else if (m.mode === "typed"){
            // only feed alphanumerics to typed buffer
            if (/^[A-Z0-9]$/.test(token)){
              if (m.push(token)) _fireEgg(m.egg);
            }
          }
        }
      }, {passive:true});

      // Optional: expose unlocked list for debugging (no UI)
      UIHelpers.getUnlockedEasterEggs = function(){
        return _loadUnlocked(appId);
      };
    }catch(_){}
  };
  // ===== /Easter Eggs =====


  // ===== Safety Net & Runtime Guards (V1) =====
  const _DS_ONCE = (global.__DS_ONCE = global.__DS_ONCE || Object.create(null));

  UIHelpers.once = function once(key, fn){
    try{
      if (_DS_ONCE[key]) return false;
      _DS_ONCE[key] = true;
      fn && fn();
      return true;
    }catch(_){ return false; }
  };

  UIHelpers.safeStorage = (function(){
    function _ls(){ try{ return global.localStorage; }catch(_){ return null; } }
    function get(key, fallback=null){
      const ls=_ls(); if(!ls) return fallback;
      try{
        const v = ls.getItem(key);
        return v==null ? fallback : v;
      }catch(_){ return fallback; }
    }
    function set(key, val){
      const ls=_ls(); if(!ls) return false;
      try{ ls.setItem(key, String(val)); return true; }catch(_){ return false; }
    }
    function remove(key){
      const ls=_ls(); if(!ls) return false;
      try{ ls.removeItem(key); return true; }catch(_){ return false; }
    }
    function getJSON(key, fallback=null){
      const raw = get(key, null);
      if (raw == null) return fallback;
      try{ return JSON.parse(raw); }catch(_){ return fallback; }
    }
    function setJSON(key, obj){
      try{ return set(key, JSON.stringify(obj)); }catch(_){ return false; }
    }
    return {get,set,remove,getJSON,setJSON};
  })();

  UIHelpers.safeFetch = async function safeFetch(url, opts){
    const o = opts || {};
    const timeoutMs = typeof o.timeoutMs === "number" ? o.timeoutMs : 18000;
    const ctrl = o.signal ? null : new AbortController();
    const signal = o.signal || ctrl.signal;
    const t = setTimeout(()=>{ try{ ctrl && ctrl.abort(); }catch(_){} }, timeoutMs);
    try{
      const res = await fetch(url, {...o, signal});
      return res;
    }finally{
      clearTimeout(t);
    }
  };

  UIHelpers.installSafetyNet = function installSafetyNet(meta){
    const doc = global.document;
    const appName = meta?.appName || "App";
    const appId = meta?.appId || "app";

    // Attach only once per appId
    UIHelpers.once(`safetynet:${appId}`, ()=>{
      try{
        global.addEventListener("error", (e)=>{
          try{
            const msg = (e && (e.message || e.error?.message)) || "Unhandled error";
            if (UIHelpers.toast) UIHelpers.toast(`${appName}: ${msg}`);
            global.TelemetryHub?.capture?.("error", {appId, appName, msg, source: e?.filename, line: e?.lineno, col: e?.colno});
          }catch(_){}
        });
        global.addEventListener("unhandledrejection", (e)=>{
          try{
            const reason = e?.reason;
            const msg = (reason && (reason.message || String(reason))) || "Unhandled rejection";
            if (UIHelpers.toast) UIHelpers.toast(`${appName}: ${msg}`);
            global.TelemetryHub?.capture?.("unhandledrejection", {appId, appName, msg});
          }catch(_){}
        });
      }catch(_){}
    });

    // Honor reduced-motion (no UI changes; just expose a flag)
    try{
      const prefers = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefers) global.__DS_PREFERS_REDUCED_MOTION = true;
    }catch(_){}
  };
  // ===== /Safety Net & Runtime Guards =====


  // ===== Performance Stability (V1) =====
  UIHelpers.installPerfStability = function installPerfStability(meta){
    const appId = meta?.appId || "app";
    const appName = meta?.appName || "App";
    UIHelpers.once(`perf:${appId}`, ()=>{
      const doc = global.document;

      // 1) Visibility pause flag (no UI changes)
      const state = (global.__DS_PERF_STATE = global.__DS_PERF_STATE || Object.create(null));
      state[appId] = state[appId] || { hidden: false, forcePause: false };

      function _setHidden(v){
        try{ state[appId].hidden = !!v; }catch(_){}
        try{ if (typeof meta?.onVisibility === "function") meta.onVisibility(!v); }catch(_){}
      }

      try{
        if (doc){
          _setHidden(!!doc.hidden);
          doc.addEventListener("visibilitychange", ()=>{ _setHidden(!!doc.hidden); try{ if (!doc.hidden) global.__DS_RAF_KICK && global.__DS_RAF_KICK(); }catch(_){} }, {passive:true});
        }
      }catch(_){}

      // 2) rAF guard: true pause in background + safe resume kick (no UI changes)
      try{
        if (!global.__DS_RAF_WRAPPED){
          global.__DS_RAF_WRAPPED = true;
          const _raf = global.requestAnimationFrame?.bind(global);
          const _caf = global.cancelAnimationFrame?.bind(global);
          if (_raf && _caf){
            // Adaptive quality state (global)
            const Q = (global.__DS_QUALITY_STATE = global.__DS_QUALITY_STATE || { q: 1.0, dt: 16.7, ema: 16.7, last: 0, kicks: 0 });
            function _tick(now){
              const last = Q.last || now;
              const dt = Math.max(0.1, Math.min(200, now - last));
              Q.last = now;
              Q.dt = dt;
              Q.ema = Q.ema * 0.92 + dt * 0.08;
              // Adjust quality slowly: target ~16-20ms
              if (Q.ema > 26) Q.q = Math.max(0.55, Q.q - 0.03);
              else if (Q.ema > 22) Q.q = Math.max(0.70, Q.q - 0.015);
              else if (Q.ema < 17) Q.q = Math.min(1.0, Q.q + 0.01);
            }

            let _lastCb = null;
            let _resumePending = false;

            global.__DS_RAF_KICK = function(){
              try{
                if (_resumePending) return;
                if (!_lastCb) return;
                const doc3 = global.document;
                const hidden = !!(doc3 && doc3.hidden);
                const forced = !!(global.__DS_FORCE_PAUSE);
                if (hidden || forced) return;
                _resumePending = true;
                _raf(function(t){
                  _resumePending = false;
                  try{ _tick(t); }catch(_){}
                  try{ _lastCb && _lastCb(t); }catch(_){}
                });
              }catch(_){}
            };

            global.requestAnimationFrame = function(cb){
              const doc2 = global.document;
              const hidden = !!(doc2 && doc2.hidden);
              const forced = !!(global.__DS_FORCE_PAUSE);
              if (hidden || forced){
                // Store last callback so we can kick it once visible again.
                _lastCb = cb;
                return 0; // paused: do not schedule work
              }
              return _raf(function(t){
                try{ _tick(t); }catch(_){}
                try{ cb(t); }catch(_){}
              });
            };

            global.cancelAnimationFrame = function(id){
              try{ return _caf(id); }catch(_){ return; }
            };

            // Expose quality getters (no forced visual changes unless apps opt in)
            global.__DS_GET_QUALITY = function(){ return (global.__DS_QUALITY_STATE && global.__DS_QUALITY_STATE.q) || 1.0; };
          }
        }
      }catch(_){}

      // 3) Throttle resize/orientation listeners to avoid resize storms
      try{
        if (!global.__DS_EVT_WRAPPED){
          global.__DS_EVT_WRAPPED = true;
          const _add = global.addEventListener?.bind(global);
          const _rem = global.removeEventListener?.bind(global);
          const map = (global.__DS_EVT_MAP = global.__DS_EVT_MAP || new WeakMap());

          function throttle(fn, ms){
            let ticking = false, lastArgs = null;
            return function(...args){
              lastArgs = args;
              if (ticking) return;
              ticking = true;
              setTimeout(()=>{
                ticking = false;
                try{ fn.apply(this, lastArgs); }catch(_){}
              }, ms);
            };
          }

          if (_add && _rem){
            global.addEventListener = function(type, listener, options){
              try{
                const t = String(type);
                if ((t === "resize" || t === "orientationchange") && typeof listener === "function"){
                  if (!map.has(listener)){
                    map.set(listener, throttle(listener, 120));
                  }
                  return _add(type, map.get(listener), options);
                }
              }catch(_){}
              return _add(type, listener, options);
            };
            global.removeEventListener = function(type, listener, options){
              try{
                const t = String(type);
                if ((t === "resize" || t === "orientationchange") && typeof listener === "function" && map.has(listener)){
                  return _rem(type, map.get(listener), options);
                }
              }catch(_){}
              return _rem(type, listener, options);
            };
          }
        }
      }catch(_){}

      // 4) WebGL context-loss guard (best-effort; no DOM/UI changes)
      try{
        function attachCanvasGuards(){
          if (!doc) return;
          const canvases = Array.from(doc.querySelectorAll("canvas"));
          for (const c of canvases){
            if (c.__ds_ctx_guard) continue;
            c.__ds_ctx_guard = true;

            c.addEventListener("webglcontextlost", (e)=>{
              try{ e.preventDefault && e.preventDefault(); }catch(_){ }
              try{ global.__DS_FORCE_PAUSE = true; }catch(_){ }
              try{ global.__DS_NEEDS_WEBGL_REBUILD = true; global.__DS_WEBGL_LOST_AT = Date.now(); }catch(_){ }
              try{ UIHelpers.toast && UIHelpers.toast(`${appName}: WebGL context lost (paused)`); }catch(_){ }
              try{ global.TelemetryHub?.capture?.("webglcontextlost", {appId, appName}); }catch(_){ }
            }, {passive:false});

            c.addEventListener("webglcontextrestored", (_e)=>{
              try{ global.__DS_FORCE_PAUSE = false; }catch(_){ }
              try{ global.__DS_NEEDS_WEBGL_REBUILD = false; global.__DS_WEBGL_RESTORED_AT = Date.now(); }catch(_){ }
              try{ UIHelpers.toast && UIHelpers.toast(`${appName}: WebGL restored`); }catch(_){ }
              try{ global.TelemetryHub?.capture?.("webglcontextrestored", {appId, appName}); }catch(_){ }
              try{ if (typeof meta?.onWebGLRestored === "function") meta.onWebGLRestored(); else global.__DS_RAF_KICK && global.__DS_RAF_KICK(); }catch(_){ }
            }, {passive:true});
          }
        }
        if (doc){
          if (doc.readyState === "loading"){
            doc.addEventListener("DOMContentLoaded", attachCanvasGuards, {once:true});
          } else {
            attachCanvasGuards();
          }
          // Also re-check shortly after boot in case canvas is created late
          setTimeout(attachCanvasGuards, 1200);
        }
      }catch(_){}

      // 5) Reduce-motion hint for animations (exposed flag only)
      try{
        const prefers = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefers) global.__DS_PREFERS_REDUCED_MOTION = true;
      }catch(_){}
    });
  };


  // Pixel ratio + device tier helpers (V1)
  UIHelpers.getDeviceTier = function(){
    try{
      const dpr = global.devicePixelRatio || 1;
      const mem = global.navigator && global.navigator.deviceMemory ? Number(global.navigator.deviceMemory) : null;
      const cores = global.navigator && global.navigator.hardwareConcurrency ? Number(global.navigator.hardwareConcurrency) : null;
      // heuristic tiers: 1 (low) / 2 (mid) / 3 (high)
      let tier = 2;
      if ((mem && mem <= 3) || (cores && cores <= 4)) tier = 1;
      if ((mem && mem >= 8) && (cores && cores >= 8)) tier = 3;
      return { tier, dpr, mem, cores };
    }catch(_){
      return { tier: 2, dpr: 1, mem: null, cores: null };
    }
  };

  UIHelpers.getQuality = function(){
    try{
      const fn = global.__DS_GET_QUALITY;
      if (typeof fn === "function") return fn();
    }catch(_){}
    return 1.0;
  };

  UIHelpers.getPixelRatio = function(appId){
    // cap DPR based on tier + adaptive quality; safe default keeps visuals similar
    try{
      const base = global.devicePixelRatio || 1;
      const tier = UIHelpers.getDeviceTier().tier;
      const q = UIHelpers.getQuality();
      const cap = (tier === 1) ? 1.25 : (tier === 2 ? 1.75 : 2.25);
      return Math.max(1, Math.min(base, cap) * q);
    }catch(_){
      return global.devicePixelRatio || 1;
    }
  };

  // ===== /Performance Stability =====

})();
