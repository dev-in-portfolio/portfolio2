
  // --- NX HARD GUARD: prevent constellation interactions while Nexus dropdown/menu is open ---
  const nxMenuIsOpen = () =>
    document.body.classList.contains("nxMenuOpen") || !!document.querySelector(".nxDrop.isOpen");

  const nxEventFromNavOrPortal = (e) => {
    const t = e && e.target;
    return !!(t && t.closest && (t.closest("nav.nxTopNav") || t.closest("#nx-dd-portal")));
  };

  const nxShouldIgnore = (e) => nxMenuIsOpen() || nxEventFromNavOrPortal(e);
  // ------------------------------------------------------------------------

/* Nexus — Constellation Map
   Data-driven renderer + pan/zoom + hover/tap preview + warp launch.
   Config lives in /shared/constellation-config.js (window.NX_CONSTELLATION_CONFIG).
*/
(() => {
  const root = document.getElementById("nxConstellation") || document.querySelector(".nxConstellation");
  if (!root) return;

  // Legacy static layer support:
  // Some earlier builds shipped a pre-rendered static node/label layer in the DOM in addition to this
  // data-driven renderer. In this build we do NOT delete legacy nodes (they may be intentionally
  // connected to the map); instead we keep them and ensure they pan/zoom with the same transform.


  // v29: Connector lines are intentionally removed (they were not behaving consistently under zoom).
  // Keep the SVG container in the DOM so we can re-enable lines later without structural churn.
  const LINES_ENABLED = false;

  const map = document.getElementById("nxMap") || root.querySelector(".nxMap");
  const svg = root.querySelector("svg.nxLines");
  const edgesG = root.querySelector("#nxEdges");
  const labelsG = root.querySelector("#nxClusterLabels") || root.querySelector(".nxClusterLabels");

  // Optional zones layer (cluster "constellations")
  let zonesG = root.querySelector("#nxZones");
  if (!zonesG) {
    zonesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    zonesG.setAttribute("id", "nxZones");
    // Ensure zones render behind edges
    if (edgesG && edgesG.parentNode) edgesG.parentNode.insertBefore(zonesG, edgesG);
    else if (svg) svg.appendChild(zonesG);
  }

  const nodesHost = root.querySelector("#nxNodes") || root.querySelector(".nxNodes");
  const warp = root.querySelector("#nxWarp") || root.querySelector(".nxWarp");

  const preview = root.querySelector("#nxPreview");
  const previewImg = root.querySelector("#nxPreviewImg");
  const previewTitle = root.querySelector("#nxPreviewTitle");
  const previewSub = root.querySelector("#nxPreviewSub");
  const previewTags = root.querySelector("#nxPreviewTags");

  const routeText = root.querySelector("#nxRouteText");
  const routeSub = root.querySelector("#nxRouteSub");

  const pillsWrap = root.querySelector(".nxHudPills");
  const pills = pillsWrap ? Array.from(pillsWrap.querySelectorAll("[data-role]")) : [];

  const CFG = window.NX_CONSTELLATION_CONFIG;
  if (!CFG || !Array.isArray(CFG.nodes) || !Array.isArray(CFG.edges)) return;

  // ---------- Helpers
  const SVG_NS = "http://www.w3.org/2000/svg";

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const byId = new Map(CFG.nodes.map(n => [n.id, n]));

  // ---------- Zone state (C+B): contextual by default + optional full regions toggle
  const zoneEls = new Map();   // clusterId -> [nebulaEllipse, ringEllipse]
  const labelEls = new Map();  // clusterId -> labelGroup
  let showAllZones = true; // regions removed; keep labels visible
  let hoveredCluster = null;
  const legendRowEls = new Map(); // clusterId -> .nxLegendRow element
  let activeRole = "all";

  // ---------- Small UI helpers (legend + optional intro)

function hexToRgb(hex){
  if(!hex) return null;
  const m = String(hex).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if(!m) return null;
  let h = m[1];
  if(h.length === 3) h = h.split("").map(ch => ch + ch).join("");
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  if(Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}


  function dotStyleFromHue(h) {
  // Accept either numeric hue OR a hex color string.
  if(typeof h === "string"){
    const rgb = hexToRgb(h);
    if(rgb){
      const { r, g, b } = rgb;
      return {
        bg: `rgba(${r}, ${g}, ${b}, 0.92)`,
        bgSoft: `rgba(${r}, ${g}, ${b}, 0.10)`,
        border: `rgba(${r}, ${g}, ${b}, 0.24)`,
        glow: `0 0 0 6px rgba(${r}, ${g}, ${b}, 0.10), 0 0 16px rgba(${r}, ${g}, ${b}, 0.32)`
      };
    }
  }
  const hue = (typeof h === "number" ? h : 210);
  return {
    bg: `hsla(${hue}, 90%, 70%, 0.92)`,
    bgSoft: `hsla(${hue}, 92%, 58%, 0.10)`,
    border: `hsla(${hue}, 88%, 74%, 0.24)`,
    glow: `0 0 0 6px hsla(${hue}, 92%, 58%, 0.10), 0 0 16px hsla(${hue}, 90%, 60%, 0.28)`
  };
}


  function renderLegend(){
    const rows = root.querySelector("#nxLegendRows");
    if(!rows || !Array.isArray(CFG.clusters)) return;
    rows.innerHTML = "";
    legendRowEls.clear();
    for(const c of CFG.clusters){
      const row = document.createElement("div");
      row.className = "nxLegendRow";
      row.dataset.cluster = c.id;
      legendRowEls.set(c.id, row);

      const dot = document.createElement("span");
      dot.className = "nxLegendDot";
      const st = dotStyleFromHue(c.color || c.hue);
      dot.style.background = st.bg;
      dot.style.boxShadow = st.glow;

      const label = document.createElement("span");
      label.textContent = c.label || c.id;

      row.appendChild(dot);
      row.appendChild(label);
      rows.appendChild(row);
    }
  }

  function updateLegendHighlight(){
    const active = hoveredCluster;
    legendRowEls.forEach((row, cid) => {
      const on = !!active && cid === active;
      row.classList.toggle("isActive", on);
      row.classList.toggle("isDim", !!active && !on);
    });
  }

  function renderIntroCats(){
    const cats = root.querySelector("#nxIntroCats");
    if(!cats || !Array.isArray(CFG.clusters)) return;
    cats.innerHTML = "";
    for(const c of CFG.clusters){
      const tag = document.createElement("span");
      tag.className = "nxTag";
      tag.textContent = c.label || c.id;
      const st = dotStyleFromHue(c.color || c.hue);
      tag.style.background = st.bgSoft;
      tag.style.borderColor = st.border;
      tag.style.color = "rgba(255,255,255,0.86)";
      cats.appendChild(tag);
    }
  }

  function bindIntroOverlay(){
    const overlay = root.querySelector("#nxIntroOverlay");
    const closeBtn = root.querySelector("#nxIntroClose");
    if(!overlay || !closeBtn) return;

    // IMPORTANT: The map beneath listens for pointer/touch gestures (pan/zoom) and can capture the pointer,
    // which prevents the button from receiving a real click on some devices (especially tablets).
    // Stop gesture events from bubbling to the map while the intro overlay is present.
    overlay.addEventListener("pointerdown", (e) => {
    if (nxShouldIgnore(e)) return;
 e.stopPropagation(); }, true);
    overlay.addEventListener("pointerup", (e) => {
    if (nxShouldIgnore(e)) return;
 e.stopPropagation(); }, true);
    overlay.addEventListener("touchstart", (e) => {
    if (nxShouldIgnore(e)) return;
 e.stopPropagation(); }, { capture: true, passive: true });
    overlay.addEventListener("touchmove", (e) => {
    if (nxShouldIgnore(e)) return;
 e.stopPropagation(); }, { capture: true, passive: true });
    overlay.addEventListener("wheel", (e) => {
    if (nxShouldIgnore(e)) return;
 e.stopPropagation(); }, { capture: true, passive: true });

    const KEY = "nx_map_intro_dismissed";
    let dismissed = true;
    try{
      dismissed = (localStorage.getItem(KEY) === "1");
    }catch(_){ dismissed = true; }

    if(!dismissed){
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
    }

    const dismiss = () => {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      try{ localStorage.setItem(KEY, "1"); }catch(_){/* ignore */}
    };

    closeBtn.addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => {
    if (nxShouldIgnore(e)) return;
 if(e.target === overlay) dismiss(); });
  }

  function rolesInclude(roleList, role){
    if(!roleList) return false;
    if(role === "all") return true;
    return roleList.includes(role) || roleList.includes("all");
  }

  function computeVisibleClusters(){
    if(showAllZones){
      return new Set(Array.isArray(CFG.clusters) ? CFG.clusters.map(c=>c.id) : []);
    }
    const s = new Set();
    // Hover always wins (B)
    if(hoveredCluster) s.add(hoveredCluster);

    // Role selection adds relevant zones (C)
    if(activeRole && activeRole !== "all"){
      for(const n of (CFG.nodes || [])){
        const roles = n.roles || ["all"];
        if(rolesInclude(roles, activeRole)){
          s.add(n.kind || "core");
        }
      }
    }
    return s;
  }

  function updateZoneVisibility(){
    const on = computeVisibleClusters();
    for(const [cid, els] of zoneEls.entries()){
      const isOn = on.has(cid);
      els.forEach(el => el && el.classList.toggle("isOn", isOn));
    }
    for(const [cid, el] of labelEls.entries()){
      el && el.classList.toggle("isOn", on.has(cid));
    }
  }


  function edgePath(from, to, bend = 0) {
    const x1 = from.x, y1 = from.y;
    const x2 = to.x, y2 = to.y;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - bend;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }

  function setRoute(role) {
    if (routeText && CFG.recommended?.defaultText) routeText.textContent = CFG.recommended.defaultText;
    if (routeSub) {
      const sub = CFG.recommended?.perRole?.[role]?.sub || "";
      routeSub.textContent = sub;
      routeSub.style.display = sub ? "block" : "none";
    }
  }

  
  // ---------- Spotlight (dim others when one node is active)
  function clearSpotlight(){
    try{
      nodesHost?.querySelectorAll('.nxNode').forEach(el => {
        el.classList.remove('isSpotOn','isSpotDim','isActive');
      });
      edgesG?.querySelectorAll('path.nxLine').forEach(el => {
        el.classList.remove('isSpotOn','isSpotDim');
      });
    }catch(_){/* ignore */}
  }

  function applySpotlight(activeId){
    if(!activeId) return clearSpotlight();
    try{
      nodesHost?.querySelectorAll('.nxNode').forEach(el => {
        const on = (el.dataset.id === activeId);
        el.classList.toggle('isSpotOn', on);
        el.classList.toggle('isSpotDim', !on);
        if(on) el.classList.add('isActive');
      });
      edgesG?.querySelectorAll('path.nxLine').forEach(el => {
        const hit = (el.dataset.from === activeId || el.dataset.to === activeId);
        el.classList.toggle('isSpotOn', hit);
        el.classList.toggle('isSpotDim', !hit);
      });
    }catch(_){/* ignore */}
  }

  function setPreviewFromNodeEl(nodeEl) {
    if (!preview || !nodeEl) return;

    const title = nodeEl.getAttribute("data-title") || "—";
    const sub = nodeEl.getAttribute("data-sub") || "";
    const img = nodeEl.getAttribute("data-img") || "";
    const kind = nodeEl.getAttribute("data-kind") || null;
    hoveredCluster = kind;
    updateZoneVisibility();
    updateLegendHighlight();

    // Spotlight the active node so the user immediately understands what's interactive.
    applySpotlight(nodeEl.dataset.id);
    const tags = (nodeEl.getAttribute("data-tags") || "").split(",").map(t => t.trim()).filter(Boolean);

    if (previewTitle) previewTitle.textContent = title;
    if (previewSub) previewSub.textContent = sub || " ";
    if (previewImg) {
      if (img) {
        let safeUrl = img;
        try { safeUrl = encodeURI(img); } catch (_) { /* keep raw */ }
        previewImg.style.backgroundImage = `url("${safeUrl}")`;
      }
      else previewImg.style.backgroundImage = "none";
    }

    if (previewTags) {
      previewTags.innerHTML = tags.map(t => `<span class="nxTag">${t}</span>`).join("");
    }

    preview.classList.add("isVisible","on");
  }

  function hidePreview() {
    if (!preview) return;
    preview.classList.remove("isVisible","on");
    hoveredCluster = null;
    updateZoneVisibility();
    updateLegendHighlight();
    clearSpotlight();
  }

  // ---------- Render: labels
  
  function ensureSvgDefs(){
    try{
      const svg = zonesG?.closest("svg") || edgesG?.closest("svg") || labelsG?.closest("svg");
      if(!svg) return;
      let defs = svg.querySelector("defs");
      if(!defs){
        defs = document.createElementNS(SVG_NS,"defs");
        svg.insertBefore(defs, svg.firstChild);
      }

      // Core glow filter
      if(!defs.querySelector("#nxGlowBlur")){
        const filter = document.createElementNS(SVG_NS,"filter");
        filter.setAttribute("id","nxGlowBlur");
        filter.innerHTML = '<feGaussianBlur in="SourceGraphic" stdDeviation="1.15" result="blur"/><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.95 0" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>';
        defs.appendChild(filter);
      }

      // Softer nebula blur (subtle, avoids "cheap circles" look)
      if(!defs.querySelector("#nxNebulaBlur")){
        const f = document.createElementNS(SVG_NS,"filter");
        f.setAttribute("id","nxNebulaBlur");
        f.innerHTML = '<feGaussianBlur in="SourceGraphic" stdDeviation="2.45" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>';
        defs.appendChild(f);
      }

    }catch(_){/* ignore */}
  }


  function renderZones(){
    // Regions + on-map category labels removed per request. Keep legend only for orientation.
    const ENABLE_REGIONS = false;
    const ENABLE_LABELS  = false;

    if(zonesG) zonesG.innerHTML = "";
    if(labelsG) labelsG.innerHTML = "";
    if(!ENABLE_REGIONS && !ENABLE_LABELS) return;
    if(!zonesG && !labelsG) return;
    ensureSvgDefs();

    // Compute zone ellipses from node membership (keeps groupings correct as you add apps)
    const clusters = Array.isArray(CFG.clusters) ? CFG.clusters : [];
    const nodes = Array.isArray(CFG.nodes) ? CFG.nodes : [];
    const byCluster = new Map();
    for(const c of clusters){
      byCluster.set(c.id, []);
    }
    for(const n of nodes){
      const k = n.kind || "core";
      if(!byCluster.has(k)) byCluster.set(k, []);
      byCluster.get(k).push(n);
    }

    // Store for visibility updates
    zoneEls.clear();
    labelEls.clear();

    const svg = zonesG.closest("svg");
    const defs = svg ? svg.querySelector("defs") : null;

    function ensureGradient(id, hue){
      if(!defs) return null;
      const gid = `nxNebula_${id}`;
      let g = defs.querySelector(`[id="${gid}"]`);
      if(!g){
        g = document.createElementNS(SVG_NS,"radialGradient");
        g.setAttribute("id", gid);
        g.setAttribute("cx","42%");
        g.setAttribute("cy","38%");
        g.setAttribute("r","70%");
        const s1 = document.createElementNS(SVG_NS,"stop");
        s1.setAttribute("offset","0%");
        s1.setAttribute("stop-color", `hsla(${hue}, 92%, 62%, 0.22)`);
        const s2 = document.createElementNS(SVG_NS,"stop");
        s2.setAttribute("offset","55%");
        s2.setAttribute("stop-color", `hsla(${hue}, 92%, 58%, 0.09)`);
        const s3 = document.createElementNS(SVG_NS,"stop");
        s3.setAttribute("offset","100%");
        s3.setAttribute("stop-color", `hsla(${hue}, 92%, 55%, 0.00)`);
        g.appendChild(s1); g.appendChild(s2); g.appendChild(s3);
        defs.appendChild(g);
      }
      return `url(#${gid})`;
    }

    // Helper to build a "pill label" in SVG (rect + text)
    function makeLabel(id, text, x, y, hue){
      const g = document.createElementNS(SVG_NS,"g");
      g.setAttribute("class","nxClusterLabel");
      g.setAttribute("data-cluster", id);

      const t = document.createElementNS(SVG_NS,"text");
      t.setAttribute("x", String(x));
      t.setAttribute("y", String(y));
      t.setAttribute("text-anchor","middle");
      t.setAttribute("dominant-baseline","middle");
      t.textContent = text;

      // approximate width (simple + stable)
      const padX = 2.8;
      const charW = 0.72; // in viewBox units
      const w = Math.max(12, (String(text).length * charW) + (padX * 2));
      const h = 4.8;

      const r = document.createElementNS(SVG_NS,"rect");
      r.setAttribute("x", String(x - w/2));
      r.setAttribute("y", String(y - h/2));
      r.setAttribute("width", String(w));
      r.setAttribute("height", String(h));
      r.setAttribute("rx","2.4");
      r.setAttribute("ry","2.4");
      r.setAttribute("fill", `hsla(${hue}, 70%, 18%, 0.36)`);
      r.setAttribute("stroke", `hsla(${hue}, 85%, 70%, 0.20)`);
      r.setAttribute("stroke-width","0.25");
      r.setAttribute("filter","url(#nxGlowBlur)");

      t.setAttribute("fill","rgba(255,255,255,0.82)");
      t.setAttribute("font-size","2.1");
      t.setAttribute("font-weight","700");
      t.setAttribute("letter-spacing","0.14");

      g.appendChild(r);
      g.appendChild(t);
      return g;
    }

    for(const c of clusters){
      const id = c.id || "";
      const members = byCluster.get(id) || [];
      if(members.length === 0) continue;

      // bbox in the 0..100 space
      let minX=100, maxX=0, minY=100, maxY=0;
      for (const n of members) {
  const nx = Number(n.x);
  const ny = Number(n.y);
  const x = clamp(Number.isFinite(nx) ? nx : 50, 0, 100);
  const y = clamp(Number.isFinite(ny) ? ny : 50, 0, 100);

  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);
}

      // padding scales with member spread (keeps it looking intentional as it grows)
      const spreadX = Math.max(6, maxX - minX);
      const spreadY = Math.max(6, maxY - minY);
      const pad = clamp(Math.max(spreadX, spreadY) * 0.22, 5.5, 11);

      const cx = clamp((minX + maxX) / 2, 8, 92);
      const cy = clamp((minY + maxY) / 2, 8, 92);
      const rx = clamp((spreadX / 2) + pad, 10, 46);
      const ry = clamp((spreadY / 2) + pad, 10, 46);
      const hue = (typeof c.hue === "number") ? c.hue : 210;

      // Regions (nebula + ring) are disabled; labels remain for wayfinding.
      let nebula = null;
      let ring = null;

      if(ENABLE_REGIONS && zonesG){
        nebula = document.createElementNS(SVG_NS,"ellipse");
        nebula.setAttribute("class","nxZone nxZone--nebula");
        nebula.setAttribute("data-cluster", id);
        nebula.setAttribute("cx", String(cx));
        nebula.setAttribute("cy", String(cy));
        nebula.setAttribute("rx", String(rx));
        nebula.setAttribute("ry", String(ry));
        nebula.setAttribute("filter","url(#nxNebulaBlur)");
        const fill = ensureGradient(id, hue) || `hsla(${hue}, 92%, 58%, 0.08)`;
        nebula.style.fill = fill;
        zonesG.appendChild(nebula);

        ring = document.createElementNS(SVG_NS,"ellipse");
        ring.setAttribute("class","nxZone nxZone--ring");
        ring.setAttribute("data-cluster", id);
        ring.setAttribute("cx", String(cx));
        ring.setAttribute("cy", String(cy));
        ring.setAttribute("rx", String(rx));
        ring.setAttribute("ry", String(ry));
        ring.setAttribute("filter","url(#nxGlowBlur)");
        ring.style.fill = "transparent";
        ring.style.stroke = `hsla(${hue}, 88%, 74%, 0.18)`;
        ring.style.strokeWidth = "0.55";
        zonesG.appendChild(ring);

        zoneEls.set(id, [nebula, ring]);
      }

      if(ENABLE_LABELS && labelsG){
        // Keep labels inside bounds (prevents cut-off)
        const lx = clamp(cx, 10, 90);
        const ly = clamp(cy, 10, 90);
        const label = makeLabel(id, c.label || id.toUpperCase(), lx, ly, hue);
        labelsG.appendChild(label);
        labelEls.set(id, label);
      }
    }

    updateZoneVisibility();
  }

function renderLabels() {
    // labels are built alongside zones (so this becomes a no-op)
    return;
  }

// ---------- Render: edges
function renderEdges() {
  if (!edgesG) return;
  edgesG.innerHTML = "";

  // Lines disabled by design (see LINES_ENABLED above)
  if (!LINES_ENABLED) return;

  for (const e of CFG.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;

    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", edgePath(a, b, e.bend || 0));
    p.classList.add("nxLine");
    p.classList.add(`nxLine--${e.kind || "core"}`);

    // Data hooks for spotlight/highlighting
    p.dataset.from = e.from;
    p.dataset.to = e.to;
    p.dataset.kind = e.kind || "core";

    if (e.style === "primary") p.classList.add("nxLine--primary");
    if (e.style === "dashed") p.classList.add("nxLine--dashed");
    if (e.style === "dotted") p.classList.add("nxLine--dotted");

    // Roles: if explicitly present use it, otherwise union of endpoints
    const roles =
      e.roles ||
      Array.from(new Set([...(a.roles || ["all"]), ...(b.roles || ["all"])]));
    p.dataset.roles = roles.join(",");
    edgesG.appendChild(p);
  }
}

// ---------- Render: nodes
function nodeHTML(n) {
  const id = String(n?.id ?? "");
  const kind = String(n?.kind ?? "core");
  const label = String(n?.label ?? (id || "Untitled"));
  const href = String(n?.href ?? "#");

  const x0 = Number(n?.x);
  const y0 = Number(n?.y);
  const x = clamp(Number.isFinite(x0) ? x0 : 50, 0, 100);
  const y = clamp(Number.isFinite(y0) ? y0 : 50, 0, 100);

  const rolesArr = Array.isArray(n?.roles) && n.roles.length ? n.roles : ["all"];
  const roleList = rolesArr.join(",");

  const tagsArr = Array.isArray(n?.tags) ? n.tags : [];
  const tags = tagsArr.join(", ");

  const sub = String(n?.sub ?? "");
  const img = String(n?.img ?? "");

  // Long labels collide easily on smaller screens; enable wrapping only when needed.
  const wrapLabel = label.length >= 16 || (label.includes(" ") && label.length >= 14);

  const externalAttrs = n?.external
    ? 'target="_blank" rel="noopener noreferrer"'
    : "";

  return `
    <a class="nxNode"
       href="${escapeHtml(href)}"
       data-id="${escapeHtml(id)}"
       data-kind="${escapeHtml(kind)}"
       data-title="${escapeHtml(label)}"
       data-sub="${escapeHtml(sub)}"
       data-img="${escapeHtml(img)}"
       data-tags="${escapeHtml(tags)}"
       data-roles="${escapeHtml(roleList)}"
       ${externalAttrs}
       style="--x:${x}; --y:${y};">
      <span class="nxDot nxDot--${escapeHtml(kind)}" aria-hidden="true"></span>
      <span class="nxLabel${wrapLabel ? " nxLabel--wrap" : ""}">${escapeHtml(label)}</span>
    </a>
  `;
}

  function escapeHtml(str) {
    const s = String(str ?? "");
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return s.replace(/[&<>"']/g, (ch) => map[ch]);
  }


  function renderNodes() {
    if (!nodesHost) return;
    nodesHost.innerHTML = CFG.nodes.map(nodeHTML).join("");

    // Add kind class hooks
    nodesHost.querySelectorAll(".nxNode").forEach(el => {
      const kind = el.getAttribute("data-kind") || "core";
      el.classList.add(`nxNode--${kind}`);
    });

    // Primary route stars (bigger glow)
    const primaryIds = new Set(
      (CFG.edges || [])
        .filter(e => e.style === "primary")
        .flatMap(e => [e.from, e.to])
    );
    nodesHost.querySelectorAll(".nxNode").forEach(el => {
      if (primaryIds.has(el.dataset.id)) el.classList.add("nxNode--primary");
    });

    // Collision nudge pass (prevents obvious label overlaps on load).
    requestAnimationFrame(() => collisionNudgePass());

  }

  // ---------- Collision nudge pass
  // Small, deterministic relaxation step in screen-space that rewrites the --x/--y
  // percentage vars on nodes. This keeps the map looking clean across viewports
  // without hand-tuning every new cluster forever.
  function collisionNudgePass() {
    if (!nodesHost || !map) return;

    const stage = map.querySelector(".nxStage") || map;
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width < 10 || stageRect.height < 10) return;

    const nodes = Array.from(nodesHost.querySelectorAll(".nxNode"));
    if (nodes.length < 2) return;

    const obstacles = [];
    const hudTL = map.querySelector(".nxHud--tl");
    const hudBL = map.querySelector(".nxHud--bl");
    const prev = map.querySelector(".nxPreview");
    [hudTL, hudBL, prev].forEach(el => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) obstacles.push(r);
    });

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const getXY = (el) => {
      const cs = getComputedStyle(el);
      const x = parseFloat(cs.getPropertyValue("--x")) || 50;
      const y = parseFloat(cs.getPropertyValue("--y")) || 50;
      return { x, y };
    };
    const setXY = (el, x, y) => {
      el.style.setProperty("--x", String(clamp(x, 4, 96)));
      el.style.setProperty("--y", String(clamp(y, 6, 94)));
    };

    const intersects = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

    // Iterative relaxation
    for (let iter = 0; iter < 28; iter++) {
      let moved = false;

      const rects = nodes.map(el => ({ el, r: el.getBoundingClientRect() }));

      // Node-node collisions
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const A = rects[i].r;
          const B = rects[j].r;
          if (!intersects(A, B)) continue;

          const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (overlapX <= 0 || overlapY <= 0) continue;

          const aCx = (A.left + A.right) / 2;
          const aCy = (A.top + A.bottom) / 2;
          const bCx = (B.left + B.right) / 2;
          const bCy = (B.top + B.bottom) / 2;
          const dx = aCx - bCx;
          const dy = aCy - bCy;

          // Push along the axis with smaller overlap (less disruptive).
          const pushPx = 0.55 * Math.min(overlapX, overlapY) + 2;
          let pushX = 0;
          let pushY = 0;
          if (overlapX < overlapY) pushX = Math.sign(dx || 1) * pushPx;
          else pushY = Math.sign(dy || 1) * pushPx;

          const dXPct = (pushX / stageRect.width) * 100;
          const dYPct = (pushY / stageRect.height) * 100;

          const aXY = getXY(rects[i].el);
          const bXY = getXY(rects[j].el);
          setXY(rects[i].el, aXY.x + dXPct, aXY.y + dYPct);
          setXY(rects[j].el, bXY.x - dXPct, bXY.y - dYPct);
          moved = true;
        }
      }

      // Node-obstacle collisions (HUD, legend, preview)
      if (obstacles.length) {
        nodes.forEach(el => {
          const r = el.getBoundingClientRect();
          obstacles.forEach(o => {
            if (!intersects(r, o)) return;
            const rCx = (r.left + r.right) / 2;
            const rCy = (r.top + r.bottom) / 2;
            const oCx = (o.left + o.right) / 2;
            const oCy = (o.top + o.bottom) / 2;
            const dx = rCx - oCx;
            const dy = rCy - oCy;
            const pushPx = 10;
            const pushX = Math.sign(dx || 1) * pushPx;
            const pushY = Math.sign(dy || 1) * pushPx;
            const dXPct = (pushX / stageRect.width) * 100;
            const dYPct = (pushY / stageRect.height) * 100;
            const xy = getXY(el);
            setXY(el, xy.x + dXPct, xy.y + dYPct);
            moved = true;
          });
        });
      }

      if (!moved) break;
    }
  }

  // ---------- Role filtering (dim, don't hide)
  function applyRole(role) {
    const r = role || "all";
    activeRole = r;

    nodesHost?.querySelectorAll(".nxNode").forEach(el => {
      const roles = (el.dataset.roles || "all").split(",").map(s => s.trim());
      const include = r === "all" || roles.includes(r) || roles.includes("all");
      el.classList.toggle("isDim", !include);
    });

    edgesG?.querySelectorAll("path.nxLine").forEach(el => {
      const roles = (el.dataset.roles || "all").split(",").map(s => s.trim());
      const include = r === "all" || roles.includes(r) || roles.includes("all");
      el.classList.toggle("isDim", !include);
    });

    pills.forEach(btn => btn.classList.toggle("active", btn.dataset.role === r));
    setRoute(r);
    updateZoneVisibility();
  }

  function setRoleAndURL(role) {
    const url = new URL(window.location.href);
    if (role === "all") url.searchParams.delete("role");
    else url.searchParams.set("role", role);
    window.history.replaceState({}, "", url);
    applyRole(role);
  }

  // ---------- Preview interactions
  function bindPreview() {
    if (!nodesHost) return;

    let hideTimer = null;
    let hoverTimer = null;
    let lastTapEl = null;
    let lastTapAt = 0;

    const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => hidePreview(), 220);
    }


    function spawnBurst(clientX, clientY){
      if(!map) return;
      try{
        const r = map.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        const b = document.createElement("div");
        b.className = "nxBurst";
        b.style.left = `${x}px`;
        b.style.top = `${y}px`;
        map.appendChild(b);
        requestAnimationFrame(() => b.classList.add("isOn"));
        setTimeout(() => b.remove(), 900);
      }catch(_){/* ignore */}
    }

const isStillInside = (fromEl, maybeInsideEl) => {
  if (!fromEl || !maybeInsideEl) return false;
  // relatedTarget can be a text node; guard with Node checks.
  return maybeInsideEl === fromEl || (fromEl.contains && fromEl.contains(maybeInsideEl));
};

nodesHost.addEventListener("pointerover", (e) => {
  const el = e.target.closest(".nxNode");
  if (!el || isCoarse) return;

  // Ignore pointerover events caused by moving between children of the same node.
  if (isStillInside(el, e.relatedTarget)) return;

  clearTimeout(hideTimer);
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => setPreviewFromNodeEl(el), 140);
});

nodesHost.addEventListener("pointerout", (e) => {
  const el = e.target.closest(".nxNode");
  if (!el || isCoarse) return;

  // Ignore pointerout events caused by moving between children of the same node.
  if (isStillInside(el, e.relatedTarget)) return;

  clearTimeout(hoverTimer);
  scheduleHide();
});

// Keep preview open while hovering it (desktop pointers).
if (preview && !isCoarse) {
  preview.addEventListener("pointerenter", () => {
    clearTimeout(hideTimer);
  }, { passive: true });

  preview.addEventListener("pointerleave", () => {
    scheduleHide();
  }, { passive: true });
}

    nodesHost.addEventListener("pointerdown", (e) => {
    if (nxShouldIgnore(e)) return;

      const el = e.target.closest(".nxNode");
      if (!el) return;

      // Coarse pointer: first tap previews, second tap launches
      if (isCoarse) {
        const now = Date.now();
        if (lastTapEl === el && (now - lastTapAt) < 1200) {
          // second tap -> allow launch (handled below)
        } else {
          e.preventDefault();
          lastTapEl = el;
          lastTapAt = now;
          setPreviewFromNodeEl(el);
          return;
        }
      }
    }, { passive: false });

    // Warp launch (all pointers)
    nodesHost.addEventListener("click", (e) => {
    if (nxShouldIgnore(e)) return;

      const el = e.target.closest(".nxNode");
      if (!el) return;

      // Respect modified clicks (new tab/window, etc.)
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // External links: don't warp, let browser do its thing
      if (el.target === "_blank") return;

      const rawHref = el.getAttribute("href") || "";
      if (!rawHref || rawHref === "#") return;

      e.preventDefault();
      spawnBurst(e.clientX, e.clientY);
      hidePreview();

      if (warp) {
        warp.classList.remove("isActive");
        // reflow
        void warp.offsetWidth;
        warp.classList.add("isActive");
        setTimeout(() => warp.classList.remove("isActive"), 520);
      }

      setTimeout(() => { window.location.href = el.href; }, 230);
    });
  }

  // ---------- Pan / zoom
  function bindPanZoom() {
    if (!map) return;
    // Guardrails:
    // - keep labels readable at default zoom
    // - still allow meaningful exploration on desktop and tablet
    const minZoom = 0.70;
    const maxZoom = 2.20;

    let panX = 0;
    let panY = 0;
    // Start slightly closer for first-glance readability (tablet-friendly)
    const DEFAULT_ZOOM = 1.02;
    let zoom = DEFAULT_ZOOM;

    function apply() {
      root.style.setProperty("--pan-x", `${panX}px`);
      root.style.setProperty("--pan-y", `${panY}px`);
      root.style.setProperty("--zoom", `${zoom}`);

      // Legacy/static node layers (if present) are intentionally disabled via CSS.
      // We do not attempt to sync or manipulate them here.
    }
    apply();

    // Dragging: add a movement threshold so taps don't accidentally pan on tablets.
    let dragging = false;
    let armed = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    const DRAG_THRESHOLD = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ? 9 : 5;
    // Tracks whether a two-finger pinch is active (we pause pointer-drag while pinching).
    let isPinching = false;

    map.addEventListener("pointerdown", (e) => {
    if (nxShouldIgnore(e)) return;

      // Don't pan when clicking buttons / nodes
      if (isPinching) return;
      if (e.button !== undefined && e.button !== 0) return;
if (
  e.target.closest(".nxNode") ||
  e.target.closest(".nxHud") ||
  e.target.closest("#nxIntroOverlay") ||
  e.target.closest(".nxIntroOverlay") ||
  e.target.closest("#nxPreview") ||
  e.target.closest("#nxLegend")
) return;
      armed = true;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
    });

    map.addEventListener("pointermove", (e) => {
    if (nxShouldIgnore(e)) return;

      if (isPinching) return;
      if (!armed && !dragging) return;
      if (pointerId !== null && e.pointerId !== pointerId) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      if (!dragging) {
        // Wait until the pointer actually moves before we grab/pan.
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        lastX = e.clientX;
        lastY = e.clientY;
        if (dist < DRAG_THRESHOLD) return;

        dragging = true;
        armed = false;
        try { map.setPointerCapture(e.pointerId); } catch (_) {}
        map.classList.add("isPanning");
      } else {
        lastX = e.clientX;
        lastY = e.clientY;
      }

      panX += dx;
      panY += dy;
      apply();
    });

    function endPointerDrag(e) {
      if (pointerId !== null && e.pointerId !== pointerId) return;
      if (dragging) {
        try { map.releasePointerCapture(e.pointerId); } catch (_) {}
        map.classList.remove("isPanning");
      }
      dragging = false;
      armed = false;
      pointerId = null;
    }

    map.addEventListener("pointerup", endPointerDrag);
    map.addEventListener("pointercancel", endPointerDrag);

    map.addEventListener("wheel", (e) => {
    if (nxShouldIgnore(e)) return;

      if (e.target.closest(".nxHud")) return;
      e.preventDefault();

      const prev = zoom;
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.08 : 0.92;
      zoom = clamp(zoom * factor, minZoom, maxZoom);

      // Zoom towards cursor
      const rect = map.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const scaleChange = (zoom / prev) - 1;
      panX -= cx * scaleChange;
      panY -= cy * scaleChange;

      apply();
    }, { passive: false });

    // Double click resets view
    map.addEventListener("dblclick", (e) => {
      if (e.target.closest(".nxNode") || e.target.closest(".nxHud")) return;
      panX = 0; panY = 0; zoom = DEFAULT_ZOOM;
      apply();
    });

    // Pinch zoom (touch)
    let pinch = null;

    map.addEventListener("touchstart", (e) => {
    if (nxShouldIgnore(e)) return;

      if (e.touches.length === 2) {
        // Disable native pinch so our math stays consistent.
        e.preventDefault();

        // If a drag was armed/active, cancel it immediately.
        dragging = false;
        armed = false;
        pointerId = null;
        map.classList.remove("isPanning");

        isPinching = true;

        const [t1, t2] = e.touches;
        pinch = {
          dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
          zoom,
          centerX: (t1.clientX + t2.clientX) / 2,
          centerY: (t1.clientY + t2.clientY) / 2,
          panX,
          panY
        };
      }
    }, { passive: false });

    map.addEventListener("touchmove", (e) => {
    if (nxShouldIgnore(e)) return;

      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();

      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / pinch.dist;

      const prev = zoom;
      zoom = clamp(pinch.zoom * ratio, minZoom, maxZoom);

      // Keep zoom centered around pinch center
      const rect = map.getBoundingClientRect();
      const cx = pinch.centerX - rect.left - rect.width / 2;
      const cy = pinch.centerY - rect.top - rect.height / 2;
      const scaleChange = (zoom / prev) - 1;

      panX = pinch.panX - cx * scaleChange;
      panY = pinch.panY - cy * scaleChange;

      apply();
    }, { passive: false });

    const endPinch = (e) => {
      // End pinch when fewer than 2 touches remain.
      if (!e || !e.touches || e.touches.length < 2) {
        pinch = null;
        isPinching = false;
      }
    };

    map.addEventListener("touchend", endPinch, { passive: true });
    map.addEventListener("touchcancel", endPinch, { passive: true });
  }

  // ---------- Starfield canvas (lightweight)
  function initStarfield() {
    const canvas = root.querySelector("canvas.nxStarfield");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0, h = 0;
    const stars = [];
    const STAR_COUNT = 140;

    function resize() {
      const rect = root.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.3,
          a: Math.random() * 0.35 + 0.12,
          tw: Math.random() * 0.8 + 0.2,
          ph: Math.random() * Math.PI * 2
        });
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const tw = 0.08 + (Math.sin(t * 0.001 * s.tw + s.ph) * 0.08);
        ctx.globalAlpha = clamp(s.a + tw, 0.05, 0.55);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    resize();
    requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
  }

  // ---------- Role init from URL
  const params = new URLSearchParams(window.location.search);
  const initialRole = params.get("role") || "all";

  // Bind pills
  pills.forEach(btn => {
    btn.addEventListener("click", () => setRoleAndURL(btn.dataset.role || "all"));
  });
  // Regions toggle removed (regions disabled).
  showAllZones = true;



  // Render everything
  renderLegend();
  renderIntroCats();
  bindIntroOverlay();

  renderZones();
  renderLabels();
  renderEdges();
  renderNodes();

  bindPreview();
  bindPanZoom();
  initStarfield();

  applyRole(initialRole);
  // Signal successful dynamic map init
  window.__NX_MAP_OK__ = true;
})();
