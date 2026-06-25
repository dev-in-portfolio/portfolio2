// ai-engines.js
// Shared local-AI bootstrap for your single-file apps.
// Drop this file next to your HTML apps and include it with:
//   <script type="module" src="ai-engines.js"></script>
//
// It exposes two globals the apps can detect:
//   window.webllm       → WebLLM (Phi-3 / Gemma style models)
//   window.transformers → transformers.js (Llama-3.2-1B etc.)
//
// No engines are required. If these imports fail (offline, blocked CDN, etc.)
// your apps will simply stay in offline narrative mode.

// Wrap everything so a failure here never breaks the app.
(async () => {
  // Some third-party ESM bundles (especially Node-targeted ones) may look for
  // a Node-style `global` or `process` reference during initialization.
  // On the web, those identifiers do not exist unless we polyfill them.
  // Keep this tiny and harmless.
  try {
    if (!globalThis.global) globalThis.global = globalThis;
    if (!globalThis.process) globalThis.process = { env: {} };
    if (!globalThis.process.env) globalThis.process.env = {};
  } catch (_e) {}

  // --- WebLLM bootstrap (Phi-3 / Gemma local in-browser LLM) -----------------
  try {
    if (!window.webllm) {
      const webllm = await import("https://esm.run/@mlc-ai/web-llm@0.2.46");
      // Attach as a global so existing checks can find it.
      window.webllm = webllm;
      console.info("[ai-engines] WebLLM loaded and attached to window.webllm");
    }
  } catch (err) {
    console.info("[ai-engines] WebLLM not available (this is fine)", err);
  }

  // --- transformers.js bootstrap (Llama-3.2-1B-Instruct etc.) ----------------
  try {
    if (!window.transformers) {
      const mod = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
      const { pipeline, env } = mod;

      // Optional: configure transformers.js environment if needed.
      // env.allowRemoteModels = true;   // default: true
      // env.allowLocalModels  = false;  // keep everything browser/remote

      window.transformers = { pipeline, env };
      console.info("[ai-engines] transformers.js loaded and attached to window.transformers");
    }
  } catch (err) {
    console.info("[ai-engines] transformers.js not available (this is fine)", err);
  }
})();
