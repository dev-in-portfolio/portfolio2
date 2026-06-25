// Minimal runtime safety helpers for Nexus apps.
// Goal: improve observability without changing app behavior.
(function () {
  'use strict';

  // ---- Error surfacing (non-invasive) ----
  window.addEventListener('error', function (e) {
    try {
      console.error('[Nexus] Uncaught error:', e.message, e.filename, e.lineno, e.colno);
    } catch (_) {}
  });

  window.addEventListener('unhandledrejection', function (e) {
    try {
      console.error('[Nexus] Unhandled rejection:', e.reason);
    } catch (_) {}
  });

  // ---- DOM helpers (no monkeypatching) ----
  window.$ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  window.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  window.byId = function (id) {
    return document.getElementById(id);
  };

  // ---- Safe storage (no global resets) ----
  function safeParse(raw) {
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }
  function safeStringify(val) {
    try { return JSON.stringify(val); } catch (_) { return null; }
  }

  window.safeStorage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        var parsed = safeParse(raw);
        return parsed === null ? (fallback === undefined ? null : fallback) : parsed;
      } catch (e) {
        console.warn('[Nexus] storage.get failed:', key, e);
        return fallback === undefined ? null : fallback;
      }
    },
    set: function (key, value) {
      try {
        var str = safeStringify(value);
        if (str != null) localStorage.setItem(key, str);
      } catch (e) {
        console.warn('[Nexus] storage.set failed:', key, e);
      }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (_) {}
    }
  };

  // ---- Canvas stability nudge (non-breaking) ----
  // Some canvases initialize before final layout. Trigger one safe resize tick.
  function oneResizeTick() {
    try { window.dispatchEvent(new Event('resize')); } catch (_) {}
  }
  window.addEventListener('load', function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(oneResizeTick);
    });
  }, { once: true });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      requestAnimationFrame(oneResizeTick);
    }
  });

  function normalizeInternalNavigation() {
    try {
      var absoluteHrefRe = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
      function absolutizeAttr(node, attr) {
        var raw = String(node.getAttribute(attr) || '').trim();
        if (!raw || raw.charAt(0) === '/' || absoluteHrefRe.test(raw)) return;
        var resolved = new URL(raw, window.location.href);
        if (resolved.origin !== window.location.origin) return;
        node.setAttribute(attr, resolved.pathname + resolved.search + resolved.hash);
      }
      document.querySelectorAll('a[href], [data-href]').forEach(function (link) {
        absolutizeAttr(link, 'href');
        absolutizeAttr(link, 'data-href');
      });
    } catch (_) {}
  }
  document.addEventListener('DOMContentLoaded', normalizeInternalNavigation, { once: true });


// ---- Agents nav patch (safe, non-breaking) ----
// Adds the Agents pill to the Nexus top nav on pages that use the shared nav markup.
// This avoids editing every HTML page and keeps the blast radius to one shared file.
function ensureAgentsNav() {
  try {
    var pills = document.querySelector('.nxPills');
    if (!pills) return;
    if (pills.querySelector('a[href="/apps/agents/"]')) return;

    var a = document.createElement('a');
    a.className = 'nxPill';
    a.href = '/apps/agents/';
    a.textContent = 'Agents';

    // Insert after Alibi (preferred), else after UBR, else before spacer/end.
    var after = pills.querySelector('a[href="/apps/alibi/"]') || pills.querySelector('a[href="/apps/ubr/"]');
    if (after && after.parentNode === pills) {
      after.insertAdjacentElement('afterend', a);
      return;
    }

    var spacer = pills.querySelector('.nxSpacer');
    if (spacer && spacer.parentNode === pills) {
      spacer.insertAdjacentElement('beforebegin', a);
    } else {
      pills.appendChild(a);
    }
  } catch (_) {}
}
document.addEventListener('DOMContentLoaded', ensureAgentsNav, { once: true });
})();
