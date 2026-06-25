// state-store.js
// Small, namespaced localStorage wrapper for all apps.
//
// Include with:
//   <script src="state-store.js"></script>
//
// Usage:
//   StateStore.save("app", "ui", { foo: "bar" });
//   const uiState = StateStore.load("app", "ui", { foo: "bar" });
//   StateStore.clearApp("app");

(function (global) {
  if (!global) return;

  const STORAGE_PREFIX = "APP_STATE_";

  function safeLocalStorage() {
    try {
      const ls = global.localStorage;
      // Some browsers throw on access in privacy modes; probe with a write/read/remove.
      const testKey = "__ds_ls_test__";
      ls.setItem(testKey, "1");
      ls.removeItem(testKey);
      return ls;
    } catch (_) {
      return null;
    }
  }

  function makeKey(appId, key) {
    return STORAGE_PREFIX + String(appId || "app") + "::" + String(key || "key");
  }

  function save(appId, key, value) {
    const ls = safeLocalStorage();
    if (!ls) return false;
    try {
      ls.setItem(makeKey(appId, key), JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function load(appId, key, fallback) {
    const ls = safeLocalStorage();
    if (!ls) return fallback;
    try {
      const raw = ls.getItem(makeKey(appId, key));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function clearApp(appId) {
    const ls = safeLocalStorage();
    if (!ls) return false;
    try {
      const prefix = STORAGE_PREFIX + String(appId || "app") + "::";
      const remove = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(prefix)) remove.push(k);
      }
      remove.forEach((k) => {
        try { ls.removeItem(k); } catch (_) {}
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearAll() {
    const ls = safeLocalStorage();
    if (!ls) return false;
    try {
      const remove = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) remove.push(k);
      }
      remove.forEach((k) => {
        try { ls.removeItem(k); } catch (_) {}
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  global.StateStore = { save, load, clearApp, clearAll };
})(typeof window !== "undefined" ? window : globalThis);
