/* Back-compat alias: nexus-topnav.js -> nexus-topnav-v2.js */
(() => {
  if (window.__NX_TOPNAV_V2_LOADED__ || window.__NX_TOPNAV_V2_LOADING__) return;
  window.__NX_TOPNAV_V2_LOADING__ = true;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "/shared/nexus-topnav-v2.js?v=48";
  s.onload = () => { window.__NX_TOPNAV_V2_LOADING__ = false; };
  s.onerror = () => { window.__NX_TOPNAV_V2_LOADING__ = false; };
  document.head.appendChild(s);
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
