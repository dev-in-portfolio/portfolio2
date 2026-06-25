// forge-sdk.llm.js (clean minimal shim)
// Purpose: keep legacy imports from the portfolio stable.
// This shim does NOT run local models. It exposes a tiny Forge-like API that
// calls the server-side ai_proxy.php (Groq) so visitors don't need keys.

(function () {
  "use strict";

  const DEFAULT_ENDPOINT = "./ai_proxy.php";
  const DEFAULT_MODEL = "llama-3.3-70b-versatile"; // change server-side if you want

  async function postJSON(url, payload, timeoutMs = 45000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
        cache: "no-store",
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      if (!res.ok) {
        const msg = (json && (json.error?.message || json.message)) || `HTTP ${res.status}`;
        console.warn(msg); return;
      }
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  // Minimal public surface
  const Forge = {
    endpoint: DEFAULT_ENDPOINT,
    model: DEFAULT_MODEL,

    // Registry for optional client-side engines/drivers.
    // Some apps expect Forge.registerLLM to exist even if we only use
    // server-side proxy mode. We keep it as a safe no-op registry.
    llmDrivers: {},

    registerLLM(name, driver) {
      try {
        const key = String(name || "").trim();
        if (!key) return false;
        Forge.llmDrivers[key] = driver;
        return true;
      } catch (_e) {
        return false;
      }
    },

    async chat({ model, messages, temperature, max_tokens }) {
      const payload = {
        model: model || Forge.model,
        messages: Array.isArray(messages) ? messages : [],
        temperature: typeof temperature === "number" ? temperature : 0.6,
        max_tokens: typeof max_tokens === "number" ? max_tokens : 512,
      };
      return postJSON(Forge.endpoint, payload);
    },

    async health() {
      try {
        const r = await fetch(`${Forge.endpoint}?health=1`, { cache: "no-store" });
        return await r.json();
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
  };

  // If some other script created window.Forge already, merge in missing methods.
  try {
    const existing = (window.Forge && typeof window.Forge === "object") ? window.Forge : {};
    window.Forge = Object.assign(existing, Forge);
  } catch (_e) {
    window.Forge = Forge;
  }
  window.ForgeLLM = window.ForgeLLM || window.Forge; // legacy alias
})();
