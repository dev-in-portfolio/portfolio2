/* Back-compat alias: nexus-topnav.js -> nexus-topnav-v2.js */
(() => {
  if (!window.__NX_TOPNAV_V2_LOADED__ && !window.__NX_TOPNAV_V2_LOADING__) {
    window.__NX_TOPNAV_V2_LOADING__ = true;
    const topnav = document.createElement('script');
    topnav.defer = true;
    topnav.src = '/shared/nexus-topnav-v2.js?v=55';
    topnav.onload = () => { window.__NX_TOPNAV_V2_LOADING__ = false; };
    topnav.onerror = () => { window.__NX_TOPNAV_V2_LOADING__ = false; };
    document.head.appendChild(topnav);
  }

  if (!window.__NEXUS_CANONICAL_ROUTES_LOADING__) {
    window.__NEXUS_CANONICAL_ROUTES_LOADING__ = true;
    const routes = document.createElement('script');
    routes.defer = true;
    routes.src = '/shared/nexus-canonical-routes.js?v=1';
    routes.onload = () => { window.__NEXUS_CANONICAL_ROUTES_LOADING__ = false; };
    routes.onerror = () => { window.__NEXUS_CANONICAL_ROUTES_LOADING__ = false; };
    document.head.appendChild(routes);
  }
})();
