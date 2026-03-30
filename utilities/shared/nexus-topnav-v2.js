/* ============================================================
   FILE: shared/nexus-topnav-v2.js  (patched)
   ============================================================ */

/* nexus-topnav-v2.js (v8)
   - Builds a dropdown-based Nexus Top Nav on every page
   - Uses a <body>-level portal for dropdown menus (prevents clipping by transformed/overflow containers)
   - Ensures only ONE set of global listeners exists (no per-dropdown document/scroll/resize spam)
   - Root-prefix detection so links work when deployed under subfolders
*/

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Globals / singletons
  // ---------------------------------------------------------------------------

  if (window.__NX_TOPNAV_V2_BOOTED__) return;
  window.__NX_TOPNAV_V2_BOOTED__ = true;

  var __nxDdSeq = 0;
  var nextDdId = function () { return "nxdd-" + (++__nxDdSeq); };

  var NX_PORTAL_ID = "nxDropdownPortalV2";
  var NX_OPEN_ATTR = "data-open";

  // Do NOT push the bar down with extra top-gap.
  // The only allowed vertical offset is the "safe top" contract (body padding-top).
  var NX_TOP_GAP = 0;

  // Any page can opt-out of the top nav entirely.
  // - <html data-nx-topnav="off">
  // - <body class="nx-no-topnav">
  var isTopNavDisabled = function () {
    try {
      var de = document.documentElement;
      if (de && de.getAttribute && de.getAttribute("data-nx-topnav") === "off") return true;
      var b = document.body;
      if (b && b.classList && b.classList.contains("nx-no-topnav")) return true;
    } catch (_) {}
    return false;
  };

  var teardownNavIfPresent = function () {
    try {
      var nav = document.querySelector("nav.nxTopNav");
      if (nav && nav.parentNode) nav.parentNode.removeChild(nav);
    } catch (_) {}
    try { closeAllDrops(null); } catch (_) {}
    try {
      document.documentElement.classList.remove("nx-has-topnav");
      document.body && document.body.classList.remove("nx-has-topnav");
      document.documentElement.style.removeProperty("--nxTopNavPx");
      document.documentElement.style.removeProperty("--nxTopNavH");
      document.documentElement.style.removeProperty("--labShellActualH");
    } catch (_) {}
  };

  var ensureDropdownPortal = function () {
    var p = document.getElementById(NX_PORTAL_ID);
    if (p) return p;

    p = document.createElement("div");
    p.id = NX_PORTAL_ID;
    p.style.position = "fixed";
    p.style.top = "0";
    p.style.left = "0";
    p.style.width = "100%";
    p.style.height = "0";
    p.style.zIndex = "100000";
    p.style.pointerEvents = "none"; // portal itself doesn't block taps
    document.body.appendChild(p);
    return p;
  };

  // ---------------------------------------------------------------------------
  // Root prefix detection (so links work under /subfolder deploys)
  // ---------------------------------------------------------------------------

  var isHttpLike = function () { return /^https?:$/i.test(window.location.protocol || ""); };

  var probe = async function (url) {
    try {
      var res = await fetch(url, { method: "HEAD", cache: "no-store" });
      return !!(res && (res.ok || (res.status >= 200 && res.status < 400)));
    } catch (_) {
      return false;
    }
  };

  var inferPrefixFromPathname = function () {
    // If deployed under /something/, pathname includes that prefix.
    // We pick the first segment as a candidate root.
    var p = window.location.pathname || "/";
    if (p === "/" || p === "") return "/";
    var segs = p.split("/").filter(Boolean);
    if (!segs.length) return "/";
    return "/" + segs[0] + "/";
  };

  var findRootPrefix = async function () {
    // 1) Fast path: already computed
    if (window.NX_ROOT_PREFIX) return window.NX_ROOT_PREFIX;

    // 2) If local file protocol, treat as root
    if (!isHttpLike()) return "/";

    // 3) Try inferred prefix; validate by probing shared asset
    var inferred = inferPrefixFromPathname();
    var testUrl = inferred.replace(/\/+$/, "/") + "shared/nexus-topnav-v2.js";
    if (await probe(testUrl)) return inferred;

    // 4) Fallback: root
    return "/";
  };

  var join = function (prefix, path) {
    prefix = (prefix || "/");
    path = (path || "");

    // prefix always ends with /
    if (prefix[prefix.length - 1] !== "/") prefix += "/";

    // remove leading /
    while (path[0] === "/") path = path.slice(1);

    return prefix + path;
  };

  var ABSOLUTE_HREF_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

  var toAbsoluteInternalHref = function (href) {
    try {
      var raw = String(href || "").trim();
      if (!raw || raw[0] === "/" || ABSOLUTE_HREF_RE.test(raw)) return raw;
      var resolved = new URL(raw, window.location.href);
      if (resolved.origin !== window.location.origin) return raw;
      return resolved.pathname + resolved.search + resolved.hash;
    } catch (_) {
      return href;
    }
  };

  var normalizeDocumentNavLinks = function () {
    try {
      document.querySelectorAll("a[href]").forEach(function (link) {
        var href = link.getAttribute("href");
        var absoluteHref = toAbsoluteInternalHref(href);
        if (absoluteHref && absoluteHref !== href) link.setAttribute("href", absoluteHref);

        var dataHref = link.getAttribute("data-href");
        var absoluteDataHref = toAbsoluteInternalHref(dataHref);
        if (absoluteDataHref && absoluteDataHref !== dataHref) link.setAttribute("data-href", absoluteDataHref);
      });
    } catch (_) {}
  };

  // ---------------------------------------------------------------------------
  // Active state helper
  // ---------------------------------------------------------------------------

  var norm = function (s) { return String(s || "").toLowerCase(); };

  var isActiveFor = function (href) {
    try {
      var cur = norm(window.location.pathname || "/");
      var h = norm(href || "");
      if (!h) return false;

      // If href contains full origin, compare pathname
      try {
        var u = new URL(href, window.location.origin);
        h = norm(u.pathname || "");
      } catch (_) {}

      // Normalize trailing slashes
      cur = cur.replace(/\/+$/, "/");
      h = h.replace(/\/+$/, "/");

      return cur === h;
    } catch (_) {
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  var el = function (tag, attrs) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    if (attrs.class) n.className = attrs.class;
    if (attrs.html != null) n.innerHTML = attrs.html;
    if (attrs.text != null) n.textContent = attrs.text;
    if (attrs.href) n.setAttribute("href", attrs.href);
    if (attrs.type) n.setAttribute("type", attrs.type);
    if (attrs.role) n.setAttribute("role", attrs.role);
    if (attrs.aria) {
      for (var ak in attrs.aria) if (Object.prototype.hasOwnProperty.call(attrs.aria, ak)) {
        n.setAttribute("aria-" + ak, attrs.aria[ak]);
      }
    }
    if (attrs.dataset) {
      for (var dk in attrs.dataset) if (Object.prototype.hasOwnProperty.call(attrs.dataset, dk)) {
        n.dataset[dk] = attrs.dataset[dk];
      }
    }
    // Append children passed after attrs
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (!c) continue;
      n.appendChild(c);
    }
    return n;
  };

  var buildLink = function (href, label, extraClass) {
    var a = el("a", { class: "nxMenuItem " + (extraClass || ""), href: href, text: label });
    if (isActiveFor(href)) a.classList.add("isActive");
    return a;
  };

  // ---------------------------------------------------------------------------
  // Dropdown portal state + placement
  // ---------------------------------------------------------------------------

  var openDrops = {}; // id -> {btn, menu}
  var lastOpenId = null;

  var setPortalOpenState = function () {
    var p = document.getElementById(NX_PORTAL_ID);
    if (!p) return;
    // When any menu open, allow pointer events inside menus only
    var any = false;
    for (var k in openDrops) {
      if (openDrops[k] && openDrops[k].menu && openDrops[k].menu.getAttribute(NX_OPEN_ATTR) === "1") {
        any = true;
        break;
      }
    }
    p.style.pointerEvents = any ? "none" : "none";
  };

  var closeAllDrops = function (exceptWrap) {
    if (typeof exceptWrap === "undefined") exceptWrap = null;
    try {
      var p = document.getElementById(NX_PORTAL_ID);
      if (p) {
        p.querySelectorAll(".nxDropMenu").forEach(function (m) { m.remove(); });
      }
    } catch (_) {}

    try {
      document.querySelectorAll(".nxDrop.isOpen").forEach(function (w) {
        if (exceptWrap && w === exceptWrap) return;
        w.classList.remove("isOpen");
      });
    } catch (_) {}

    openDrops = {};
    lastOpenId = null;
    setPortalOpenState();
  };

  var placeMenu = function (btn, menu) {
    if (!btn || !menu) return;

    var r = btn.getBoundingClientRect();
    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    // default placement
    var top = Math.round(r.bottom + 10);
    var left = Math.round(r.left);
    var maxH = Math.round(vh - top - 14);

    // keep within viewport
    var menuW = menu.offsetWidth || 260;
    if (left + menuW + 14 > vw) left = Math.max(14, vw - menuW - 14);
    if (top + 120 > vh) {
      // flip up if too low
      var upTop = Math.round(r.top - 10 - Math.min(menu.offsetHeight || 240, vh - 28));
      top = Math.max(14, upTop);
      maxH = Math.round(r.top - 14);
    }

    menu.style.top = String(top) + "px";
    menu.style.left = String(left) + "px";
    menu.style.maxHeight = String(maxH) + "px";
  };

  var placeAllOpen = function () {
    for (var id in openDrops) {
      var d = openDrops[id];
      if (!d || !d.menu) continue;
      if (d.menu.getAttribute(NX_OPEN_ATTR) !== "1") continue;
      placeMenu(d.btn, d.menu);
    }
  };

  var rafPlaceAll = function () { return requestAnimationFrame(placeAllOpen); };

  // ---------------------------------------------------------------------------
  // Global listener guard (only once)
  // ---------------------------------------------------------------------------

  var globalsBound = false;

  var bindGlobalsOnce = function () {
    if (globalsBound) return;
    globalsBound = true;

    // Capture taps to close menus on outside click
    var __nxDropCapture = function (e) {
      try {
        var t = e && e.target;
        if (!t) return;
        if (t.closest && (t.closest(".nxDropMenu") || t.closest(".nxDrop"))) return;
        closeAllDrops(null);
      } catch (_) {}
    };

    document.addEventListener("pointerup", __nxDropCapture, { capture: true });
    document.addEventListener("touchend", __nxDropCapture, { capture: true, passive: false });

    // Defensive: stop "click-through" to map nodes behind the menu
    var nxGuardPointerEvents = function (e) {
      try {
        var t = e && e.target;
        if (!t) return;
        var menu = t.closest ? t.closest(".nxDropMenu") : null;
        if (menu) {
          // inside menu: stop propagation so canvases/maps don't steal it
          e.stopPropagation();
        }
      } catch (_) {}
    };

    document.addEventListener("pointerdown", nxGuardPointerEvents, { capture: true });
    document.addEventListener("touchstart", nxGuardPointerEvents, { capture: true, passive: false });
    document.addEventListener("mousedown", nxGuardPointerEvents, { capture: true });
    document.addEventListener("click", nxGuardPointerEvents, { capture: true });

    // Hard-route reliability: if an anchor is tapped, trust it even if canvases try to eat the event
    var nxHardRoute = function (e) {
      try {
        var t = e && e.target;
        if (!t) return;
        var a = t.closest ? t.closest("a") : null;
        if (!a) return;
        // Only for our nav/menu links
        if (!a.classList || (!a.classList.contains("nxPill") && !a.classList.contains("nxMenuItem"))) return;
        // Let browser handle navigation; just stop other captures underneath
        e.stopPropagation();
      } catch (_) {}
    };

    document.addEventListener("pointerup", nxHardRoute, { capture: true });
    document.addEventListener("click", nxHardRoute, { capture: true });
    document.addEventListener("touchend", nxHardRoute, { capture: true, passive: false });

    // Re-place open menus on scroll/resize (cheap + throttled by RAF)
    window.addEventListener("scroll", rafPlaceAll, { passive: true });
    window.addEventListener("resize", rafPlaceAll, { passive: true });

    // ESC closes menus
    document.addEventListener("keydown", function (e) {
      if (!e) return;
      if (e.key === "Escape" || e.keyCode === 27) closeAllDrops(null);
    }, { capture: true });
  };

  // ---------------------------------------------------------------------------
  // Build dropdown (kept for compatibility, even if you use landing links now)
  // ---------------------------------------------------------------------------

  var buildDrop = function (label, items) {
    var id = nextDdId();

    var wrap = el("div", { class: "nxDrop", dataset: { nxDrop: id } });
    var btn = el("button", {
      class: "nxPill nxDropBtn",
      type: "button",
      text: label,
      aria: { haspopup: "menu", expanded: "false" }
    });

    var menu = el("div", { class: "nxDropMenu", dataset: { nxDdid: id } });
    menu.setAttribute(NX_OPEN_ATTR, "0");

    // Build menu content
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it === "sep") {
        menu.appendChild(el("div", { class: "nxSep" }));
        continue;
      }
      if (it && it.type === "hdr") {
        menu.appendChild(el("div", { class: "nxHdr", text: it.label || "" }));
        continue;
      }
      if (it && it.href) {
        menu.appendChild(buildLink(it.href, it.label || it.href));
      }
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      bindGlobalsOnce();

      // Close others
      closeAllDrops(wrap);

      var p = ensureDropdownPortal();
      // Remove any prior menus for this id
      try {
        var m = document.getElementById(id) || document.querySelector(".nxDropMenu[data-nx-ddid=\"" + id + "\"]");
        if (m && m.parentNode) m.parentNode.removeChild(m);
      } catch (_) {}

      // Portalize menu
      p.appendChild(menu);
      menu.setAttribute(NX_OPEN_ATTR, "1");
      wrap.classList.add("isOpen");
      btn.setAttribute("aria-expanded", "true");

      openDrops[id] = { btn: btn, menu: menu };
      lastOpenId = id;

      // allow taps inside menu
      menu.style.pointerEvents = "auto";
      placeMenu(btn, menu);
      setPortalOpenState();
    });

    wrap.appendChild(btn);
    return wrap;
  };

  var cleanupPortalMenus = function () {
    try {
      var p = document.getElementById(NX_PORTAL_ID);
      if (!p) return;
      p.querySelectorAll(".nxDropMenu").forEach(function (m) { m.remove(); });
    } catch (_) {}
    closeAllDrops(null);
  };

  // ---------------------------------------------------------------------------
  // Apply / init
  // ---------------------------------------------------------------------------

  var applyingNav = false;

  var applyNav = async function () {
    // Map/constellation and any other opt-out pages should never show the bar.
    if (isTopNavDisabled()) {
      teardownNavIfPresent();
      return;
    }
var nav = document.querySelector("nav.nxTopNav");
if (!nav) {
  // Some pages (especially hub pages) don't include a nav placeholder.
  // Create one so the topnav can always mount (prevents "missing Nexus bar" regressions).
  nav = document.createElement("nav");
  nav.className = "nxTopNav";
  try {
    // insert as first element in body
    if (document.body && document.body.firstChild) {
      document.body.insertBefore(nav, document.body.firstChild);
    } else if (document.body) {
      document.body.appendChild(nav);
    } else {
      document.documentElement.appendChild(nav);
    }
  } catch (_) { }
}

    // Prevent re-entrancy / races (applyNav is async and can be triggered by RAF + MutationObserver).
    if (applyingNav) return;

    // Prevent re-building
    var state = nav.getAttribute("data-nx-nav");
    if (state === "v2" || state === "building") return;

    applyingNav = true;
    var built = false;
    nav.setAttribute("data-nx-nav", "building");
    nav.classList.add("nxTopNav--v2");

    // Ensure nav is always tappable above fancy canvases
    nav.style.position = "fixed";
    nav.style.top = String(NX_TOP_GAP) + "px";
    nav.style.left = "0";
    nav.style.right = "0";
    nav.style.zIndex = "100000";
    nav.style.pointerEvents = "auto";

    // Reserve space so the fixed nav never overlays app UI.
    // NOTE: Safe-top sizing is handled by applySafeTop() below (single source of truth).

    try {
      // Hard-reset any prior portal menus (prevents ghosts when a nav template swaps).
      cleanupPortalMenus();

      var rootPrefix = await findRootPrefix();
      window.NX_ROOT_PREFIX = rootPrefix;
      normalizeDocumentNavLinks();

      // If nav markup isn't present, build it.
      // NOTE: Per request, remove the "✦ NEXUS" brand label from the bar.
      if (!nav.querySelector(".nxPills")) {
        nav.innerHTML = '<div class="nxInner"><div class="nxPills"></div></div>';
      }

      var pillsHost = nav.querySelector(".nxPills");
      if (!pillsHost) return;
      pillsHost.innerHTML = "";

      // Landing hubs are the single source of truth (no dropdown data lists here).

      function mkIconPill(href, imgSrc, altText){
        var a = document.createElement("a");
        a.className = "nxPill nxIconPill";
        a.href = href;
        var img = document.createElement("img");
        img.src = imgSrc;
        img.alt = altText || "Nexus";
        img.loading = "eager";
        img.decoding = "async";
        a.appendChild(img);
        return a;
      }

      function mkPill(label, href, newTab) {
        var a = document.createElement("a");
        a.className = "nxPill";
        a.href = href;
        a.textContent = label;
        if (newTab) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        return a;
      }

      function nxHost() {
        try { return (window.location && window.location.hostname) ? String(window.location.hostname) : ""; } catch(_) { return ""; }
      }

      function nxHref(label, internalHref) {
        var h = nxHost();
        var isMain = (h.indexOf("dev-in-portfolio.netlify.app") !== -1);
        var isUtilities = (h.indexOf("dev-in-portfolio-utilities") !== -1);
        var isCapabilities = (h.indexOf("dev-in-portfolio-capabilities") !== -1);

        if (label === "Utilities") {
          return isUtilities ? join(rootPrefix, internalHref) : "https://dev-in-portfolio-utilities.netlify.app/";
        }
        if (label === "Capabilities") {
          return isCapabilities ? join(rootPrefix, internalHref) : "https://dev-in-portfolio-capabilities.netlify.app/";
        }

        // On standalone sites, Home/Apps/About/Contact should point back to MAIN hub.
        if (!isMain && (isUtilities || isCapabilities) && (label === "Home" || label === "Apps" || label === "About" || label === "Contact")) {
          return "https://dev-in-portfolio-home.netlify.app/" + String(internalHref || "");
        }

        return join(rootPrefix, internalHref);
      }

      function nxNewTab(label) {
        var h = nxHost();
        var isMain = (h.indexOf("dev-in-portfolio.netlify.app") !== -1);
        var isUtilities = (h.indexOf("dev-in-portfolio-utilities") !== -1);
        var isCapabilities = (h.indexOf("dev-in-portfolio-capabilities") !== -1);

        if (label === "Utilities") return !isUtilities;
        if (label === "Capabilities") return !isCapabilities;

        if (!isMain && (isUtilities || isCapabilities) && (label === "Home" || label === "Apps" || label === "About" || label === "Contact")) return true;
        return false;
      }

      pillsHost.appendChild(mkPill("Home", nxHref("Home",""), nxNewTab("Home")));

      // Landing hubs (no dropdowns)
      pillsHost.appendChild(mkPill("Apps", nxHref("Apps","apps/"), nxNewTab("Apps")));
      pillsHost.appendChild(mkPill("Utilities", nxHref("Utilities","tools/"), nxNewTab("Utilities")));
      pillsHost.appendChild(mkPill("Capabilities", nxHref("Capabilities","capabilities/"), nxNewTab("Capabilities")));

      // Direct links
      pillsHost.appendChild(mkPill("About", nxHref("About","about/"), nxNewTab("About")));
      pillsHost.appendChild(mkPill("Contact", nxHref("Contact","contact/"), nxNewTab("Contact")));
// NOTE: Agents lives under the Apps landing hub; no direct pill here (avoids duplicates).

      // --- Safe Top Offset Contract ---
      // Measure the rendered topnav height and publish a global CSS variable every app can consume.
      // This is the single source of truth for "dead space" under the Nexus bar.
      function applySafeTop() {
        try {
          // Measure rendered height (handles wraps, zoom, fonts)
          var rect = (nav && nav.getBoundingClientRect) ? nav.getBoundingClientRect() : null;
          var navH = rect ? rect.height : (nav ? (nav.offsetHeight || 0) : 0);
          if (!navH) return;

          // Keep the safe-top contract tight.
          // Keep this tight. The bar already has internal padding; any extra cushion reads as "random empty space".
          var cushion = 0;
          var topPx = Math.max(0, Math.round(navH + cushion));

          // Publish vars (CSS computes --nxSafeTop from --nxTopNavPx + safe-area inset)
          document.documentElement.style.setProperty("--nxTopNavPx", topPx + "px");
          document.documentElement.style.setProperty("--nxTopNavH", Math.max(0, Math.round(navH)) + "px");
          // Legacy/compat var used by a few older shells
          document.documentElement.style.setProperty("--labShellActualH", topPx + "px");

          document.documentElement.classList.add("nx-has-topnav");
          try { document.body && document.body.classList.add("nx-has-topnav"); } catch (_) {}

          // Fullscreen app helper: for known full-viewport shells, reduce height so UI isn't clipped.
          // Only touch likely app roots to avoid breaking normal pages.
          var appRoot = document.querySelector("body > #app, body > #root, body > main, body > .app, body > .wrap, body > .root, body > .page, body > .container");
          if (appRoot && appRoot !== nav) {
            var cs = window.getComputedStyle ? window.getComputedStyle(appRoot) : null;
            if (cs) {
              var looksViewport = (cs.height === "100vh" || cs.minHeight === "100vh" || cs.maxHeight === "100vh");
              var fixedOrAbs = (cs.position === "fixed" || cs.position === "absolute");
              // If it was meant to be full-viewport, make it "viewport minus safe top"
              if (looksViewport || fixedOrAbs) {
                appRoot.style.top = "var(--nxSafeTop)";
                appRoot.style.height = "calc(100vh - var(--nxSafeTop))";
                appRoot.style.minHeight = "calc(100vh - var(--nxSafeTop))";
              }
            }
          }
        } catch (_) { }
      }

      // Initial + after layout settles
      applySafeTop();
      requestAnimationFrame(applySafeTop);
      setTimeout(applySafeTop, 50);
      setTimeout(applySafeTop, 250);

      // Keep it correct across resizes, font swaps, and nav wraps.
      try { window.addEventListener("resize", applySafeTop, { passive: true }); } catch (_) { }
      try { window.addEventListener("orientationchange", function () { setTimeout(applySafeTop, 50); }, { passive: true }); } catch (_) { }
      try {
        if ("ResizeObserver" in window) {
          var ro = new ResizeObserver(function () { applySafeTop(); });
          ro.observe(nav);
        }
      } catch (_) { }

      built = true;
      nav.setAttribute("data-nx-nav", "v2");
    } finally {
      applyingNav = false;
      if (!built) {
        try { nav.removeAttribute("data-nx-nav"); } catch (_) { }
      }
    }
  };

  // Robust init: nav may be injected after DOMContentLoaded.
  var start = function () {
    // Hardening: applyNav() is async; always attach a catch handler so any
    // unexpected error does not surface as unhandledrejection (which can
    // stop the nav from rendering on some browsers/WebViews).
    var safeApplyNav = function () {
      try {
        var p = applyNav();
        if (p && typeof p.catch === "function") {
          p.catch(function () { /* swallow to prevent unhandledrejection */ });
        }
      } catch (_) { /* swallow */ }
    };

    safeApplyNav();

    // Retry a few frames in case another script injects nav late
    var tries = 0;
    var maxTries = 180; // ~3s at 60fps
    var rafRetry = function () {
      tries += 1;
      safeApplyNav();
      var _n = document.querySelector("nav.nxTopNav");
      if (_n && _n.getAttribute("data-nx-nav") === "v2") return;
      if (tries < maxTries) requestAnimationFrame(rafRetry);
    };
    requestAnimationFrame(rafRetry);

    // Watch DOM for nav insertion
    try {
      var mo = new MutationObserver(function () { safeApplyNav(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) { }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

})();
// =======================
// NEXUS ABSOLUTE LINK WIRING (canonical) — NEXUS_ABSOLUTE_LINKS_CANONICAL_V1
// =======================
(function () {
  const CANON = Object.freeze({
    home:         "https://dev-in-portfolio-home.netlify.app/",
    apps:         "https://dev-in-portfolio-apps.netlify.app/",
    utilities:    "https://dev-in-portfolio-utilities.netlify.app/",
    capabilities: "https://dev-in-portfolio-capabilities.netlify.app/",
    about:        "https://dev-in-portfolio-about.netlify.app/",
    contact:      "https://dev-in-portfolio-contact.netlify.app/",
  });

  const LABEL_TO_URL = new Map([
    ["home", CANON.home],
    ["apps", CANON.apps],
    ["utilities", CANON.utilities],
    ["capabilities", CANON.capabilities],
    ["about", CANON.about],
    ["contact", CANON.contact],
  ]);

  const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

  function findNexusContainer() {
    // preferred explicit mounts/classes
    const direct =
      document.querySelector("#nexus-bar") ||
      document.querySelector(".nexus-bar") ||
      document.querySelector('nav[aria-label="Nexus"]') ||
      document.querySelector('nav[aria-label="NEXUS"]') ||
      document.querySelector("nav.nexus") ||
      document.querySelector(".topnav") ||
      document.querySelector(".top-nav");
    if (direct) return direct;

    // fallback: find a nav/header that contains >=3 of the nexus labels
    const candidates = Array.from(document.querySelectorAll("nav, header"));
    let best = null;
    let bestScore = 0;

    for (const el of candidates) {
      const anchors = el.querySelectorAll("a");
      let score = 0;
      anchors.forEach((a) => {
        const key = norm(a.textContent);
        if (LABEL_TO_URL.has(key)) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return bestScore >= 3 ? best : null;
  }

  function applyNexusAbsoluteLinks() {
    const bar = findNexusContainer();
    if (!bar) return;

    const currentOrigin = window.location.origin;

    const anchors = bar.querySelectorAll("a[href]");
    anchors.forEach((a) => {
      const key = norm(a.textContent);

      // rewrite only recognized nexus links
      if (LABEL_TO_URL.has(key)) {
        a.setAttribute("href", LABEL_TO_URL.get(key));
      }

      // active state by origin match (works across separate Netlify sites)
      a.classList.remove("active");
      a.removeAttribute("aria-current");

      if (!LABEL_TO_URL.has(key)) return;

      try {
        const targetOrigin = new URL(a.href, window.location.href).origin;
        if (targetOrigin === currentOrigin) {
          a.classList.add("active");
          a.setAttribute("aria-current", "page");
        }
      } catch (_) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyNexusAbsoluteLinks);
  } else {
    applyNexusAbsoluteLinks();
  }
  // one delayed pass in case nav renders async
  setTimeout(applyNexusAbsoluteLinks, 250);
})();
