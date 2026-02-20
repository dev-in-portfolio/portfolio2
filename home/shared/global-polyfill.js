// global-polyfill.js
// Some browser-hosted ESM bundles (and a few legacy snippets) assume Node-style
// globals exist. On the web, `global` is not a defined identifier.
// This tiny shim makes `global` and `process.env` available.

/* eslint-disable no-var */
var global = (typeof window !== "undefined")
  ? window
  : (typeof globalThis !== "undefined")
    ? globalThis
    : this;

try {
  // Ensure `global` is also reachable as a property (common expectation).
  if (!global.global) global.global = global;

  // Minimal `process.env` polyfill (some libs probe it).
  if (!global.process) global.process = { env: {} };
  if (!global.process.env) global.process.env = {};
} catch (_e) {}

// String.prototype.replaceAll polyfill (for older Safari/embedded browsers)
try {
  if (typeof String.prototype.replaceAll !== "function") {
    // Minimal spec-ish behavior for string search values.
    // If `searchValue` is a RegExp, native replaceAll throws unless global; we simply delegate to replace.
    // (Our codebase only uses string search values.)
    // eslint-disable-next-line no-extend-native
    String.prototype.replaceAll = function(searchValue, replaceValue) {
      const str = String(this);
      if (searchValue instanceof RegExp) {
        return str.replace(searchValue, replaceValue);
      }
      const search = String(searchValue);
      if (search === "") return str;
      return str.split(search).join(String(replaceValue));
    };
  }
} catch (_e) {}
