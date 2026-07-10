(() => {
  'use strict';

  if (window.__NEXUS_CANONICAL_ROUTES_ACTIVE__) return;
  window.__NEXUS_CANONICAL_ROUTES_ACTIVE__ = true;

  const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  const canonicalOrigin = localHost ? window.location.origin : 'https://dev-in-portfolio.netlify.app';
  const routeByLabel = Object.freeze({
    home: '/',
    apps: '/apps/',
    utilities: '/tools/',
    capabilities: '/capabilities/',
    about: '/about/',
    contact: '/contact/'
  });
  const legacyHostToLabel = Object.freeze({
    'dev-in-portfolio-home.netlify.app': 'home',
    'dev-in-portfolio-apps.netlify.app': 'apps',
    'dev-in-portfolio-utilities.netlify.app': 'utilities',
    'dev-in-portfolio-capabilities.netlify.app': 'capabilities',
    'dev-in-portfolio-about.netlify.app': 'about',
    'dev-in-portfolio-contact.netlify.app': 'contact'
  });

  const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const targetForLabel = label => {
    const path = routeByLabel[normalize(label)];
    return path ? new URL(path, `${canonicalOrigin}/`).href : null;
  };

  function labelForAnchor(anchor) {
    const dataKey = normalize(anchor.getAttribute('data-nexus'));
    if (routeByLabel[dataKey]) return dataKey;

    const textKey = normalize(anchor.textContent);
    if (routeByLabel[textKey]) return textKey;

    try {
      const url = new URL(anchor.getAttribute('href') || '', window.location.href);
      return legacyHostToLabel[url.hostname] || null;
    } catch {
      return null;
    }
  }

  function applyCanonicalRoutes(root = document) {
    root.querySelectorAll?.('a[href], a[data-nexus]').forEach(anchor => {
      const label = labelForAnchor(anchor);
      const target = targetForLabel(label);
      if (!target) return;

      if (anchor.href !== target) anchor.setAttribute('href', target);
      anchor.removeAttribute('target');

      const targetUrl = new URL(target);
      const currentPath = window.location.pathname.replace(/\/+$/, '/') || '/';
      const targetPath = targetUrl.pathname.replace(/\/+$/, '/') || '/';
      const active = window.location.hostname === targetUrl.hostname && currentPath === targetPath;
      anchor.classList.toggle('active', active);
      anchor.classList.toggle('isActive', active);
      if (active) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });
  }

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      applyCanonicalRoutes();
    });
  }

  document.addEventListener('click', event => {
    const anchor = event.target?.closest?.('a[href], a[data-nexus]');
    if (!anchor) return;
    const target = targetForLabel(labelForAnchor(anchor));
    if (!target) return;
    if (anchor.href !== target) anchor.setAttribute('href', target);
  }, true);

  const start = () => {
    applyCanonicalRoutes();
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href', 'data-nexus']
    });
    [0, 50, 250, 600, 1200].forEach(delay => window.setTimeout(applyCanonicalRoutes, delay));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
