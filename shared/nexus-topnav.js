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
