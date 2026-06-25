// forge-llm-drivers.js

// DS_DRIVER_HARDEN_V1
function _dsFetch(url, opts){
  try{
    const h = (typeof window !== "undefined") ? window.UIHelpers : null;
    if (h && typeof h.safeFetch === "function") return h.safeFetch(url, opts);
  }catch(_){}
  return fetch(url, opts);
}
function _dsJSONSafe(text){
  try{ return JSON.parse(text); }catch(_){ return null; }
}
// Ready-to-drop LLM drivers for Forge v5 AI layer.
// Include in HTML AFTER forge-sdk.llm.js:
//
//   <script src="forge-sdk.llm.js"></script>
//   <script type="module" src="forge-llm-drivers.js"></script>
//
// Exposes four drivers:
//   - "gemma-webllm"   → WebLLM (Gemma / Phi-3 family)
//   - "llama-xenova"   → transformers.js (Llama 3.2 1B/3B)
//   - "mistral-ollama" → Local Ollama (Mistral 7B)
//   - "tinystories"    → TinyStories JS/WASM (if available)
//
// All follow the Forge.chat() contract:
//   const { text } = await Forge.chat({
//     modelList: ["mistral-ollama", "gemma-webllm", "llama-xenova", "tinystories"],
//     system: "You are ...",
//     prompt: "Explain ...",
//     stream: false,
//     onToken(token, full, raw) { ... } // only if stream: true
//   });

// This file is intended to be loaded as an ES module.
// Some upstream bundles still assume Node globals.
// Provide minimal shims before loading those dependencies.
// (Must use dynamic imports so the shims run before dependency evaluation.)
if (!globalThis.global) globalThis.global = globalThis;
if (!globalThis.process) globalThis.process = { env: {} };

const webllm = await import("https://esm.run/@mlc-ai/web-llm@0.2.46");
const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");

// --- 1. WebLLM: Gemma / Phi-3 (MAGMA / general chat) -----------------------

const GEMMA_MODEL_ID = "gemma-2b-it-q4f16_1-MLC"; // change if you prefer Phi-3-mini
let gemmaEnginePromise = null;
let gemmaEngine = null;

async function ensureGemmaEngine() {
  if (gemmaEngine) return gemmaEngine;
  if (!gemmaEnginePromise) {
    gemmaEnginePromise = webllm.CreateMLCEngine(GEMMA_MODEL_ID, {
      initProgressCallback: (info) => {
        console.log(
          "[Forge/LLM gemma-webllm] loading",
          GEMMA_MODEL_ID,
          Math.round((info.progress || 0) * 100) + "%"
        );
      },
    }).then((engine) => {
      gemmaEngine = engine;
      return engine;
    });
  }
  return gemmaEnginePromise;
}

if (typeof window !== "undefined" && window.Forge) {
  window.Forge.registerLLM("gemma-webllm", {
    name: "Gemma 2B (WebLLM)",
    ready() {
      // If this script loaded, we can at least attempt to init later.
      return true;
    },
    async init() {
      await ensureGemmaEngine();
    },
    async generate({ system = "", prompt = "", messages = null, stream = false, onToken }) {
      const engine = await ensureGemmaEngine();

      let chatMessages = messages;
      if (!chatMessages || !Array.isArray(chatMessages) || !chatMessages.length) {
        // Build OpenAI-style messages if not provided
        chatMessages = [];
        if (system) chatMessages.push({ role: "system", content: system });
        if (prompt) chatMessages.push({ role: "user", content: prompt });
      }

      const payload = {
        messages: chatMessages,
        stream,
        temperature: 0.2,
        max_tokens: 512,
      };

      if (!stream) {
        const out = await engine.chat.completions.create(payload);
        const content = out.choices?.[0]?.message?.content || "";
        return { text: content, raw: out };
      }

      let full = "";
      const chunks = await engine.chat.completions.create(payload);

      for await (const chunk of chunks) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (!token) continue;
        full += token;
        if (typeof onToken === "function") {
          onToken(token, full, chunk);
        }
      }

      return { text: full };
    },
  });
}

// --- 2. transformers.js: Llama 3.2 1B/3B (PRISM) ---------------------------

const LLAMA_MODEL_ID = "Xenova/llama-3.2-3b-instruct"; // or 1B if you prefer smaller
let llamaPipePromise = null;
let llamaPipe = null;

async function ensureLlamaPipeline() {
  if (llamaPipe) return llamaPipe;
  if (!llamaPipePromise) {
    console.log("[Forge/LLM llama-xenova] loading", LLAMA_MODEL_ID);
    llamaPipePromise = pipeline("text-generation", LLAMA_MODEL_ID, {
      quantized: true,
      progress_callback: (p) => {
        console.log(
          "[Forge/LLM llama-xenova] progress",
          p.status,
          Math.round((p.progress || 0) * 100) + "%"
        );
      },
    }).then((p) => {
      llamaPipe = p;
      return p;
    });
  }
  return llamaPipePromise;
}

if (typeof window !== "undefined" && window.Forge) {
  window.Forge.registerLLM("llama-xenova", {
    name: "Llama 3.2 (transformers.js)",
    ready() {
      // We rely on ESM import; if this file loaded, we can init.
      return true;
    },
    async init() {
      await ensureLlamaPipeline();
    },
    async generate({ system = "", prompt = "", messages = null, stream = false, onToken }) {
      const pipe = await ensureLlamaPipeline();

      let fullPrompt = "";
      if (messages && Array.isArray(messages) && messages.length) {
        // naive flatten if someone sends messages
        fullPrompt = messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n");
      } else {
        fullPrompt = system ? system + "\n\n" + prompt : prompt;
      }

      const out = await pipe(fullPrompt, {
        max_new_tokens: 256,
        temperature: 0.7,
      });

      const gen = Array.isArray(out) && out[0]?.generated_text
        ? out[0].generated_text
        : String(out);

      // Basic: try to strip the prompt back off, otherwise just return full
      const text =
        gen.startsWith(fullPrompt) ? gen.slice(fullPrompt.length).trim() : gen.trim();

      if (stream && typeof onToken === "function") {
        // Simple "fake streaming": push once with the full text.
        onToken(text, text, null);
      }

      return { text, raw: out };
    },
  });
}

// --- 3. Ollama: Mistral 7B (HELIOS) ----------------------------------------

// NOTE: Requires user to have Ollama running locally with a "mistral" model.
//   ollama run mistral
//
// If CORS becomes an issue, user may need to adjust Ollama settings
// or use a tiny local proxy.

const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_MODEL_ID = "mistral";

async function simpleOllamaHealthCheck() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

if (typeof window !== "undefined" && window.Forge) {
  window.Forge.registerLLM("mistral-ollama", {
    name: "Mistral 7B (Ollama)",
    ready() {
      // We don't aggressively ping here; health is re-checked inside generate().
      return true;
    },
    async init() {
      // no-op; lazy health check on first generate
    },
    async generate({ system = "", prompt = "", messages = null, stream = false, onToken }) {
      const healthy = await simpleOllamaHealthCheck();
      if (!healthy) {
        console.warn(
          "[Forge/LLM mistral-ollama] Ollama not reachable on http://localhost:11434"
        ); return;
      }

      const body = {
        model: OLLAMA_MODEL_ID,
        stream: !!(stream && typeof onToken === "function"),
        messages: [],
      };

      if (messages && Array.isArray(messages) && messages.length) {
        body.messages = messages;
      } else {
        if (system) {
          body.messages.push({ role: "system", content: system });
        }
        body.messages.push({ role: "user", content: prompt });
      }

      const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!body.stream) {
        const json = await res.json();
        const text = json.message?.content || json.response || "";
        return { text: text.trim(), raw: json };
      }

      // Streaming NDJSON
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let full = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;

          let evt;
          try {
            evt = JSON.parse(line);
          } catch {
            console.warn("[Forge/LLM mistral-ollama] bad chunk:", line);
            continue;
          }

          const token = evt.message?.content || evt.response || "";
          if (!token) continue;
          full += token;
          if (typeof onToken === "function") {
            onToken(token, full, evt);
          }
        }
      }

      return { text: full.trim() };
    },
  });
}

// --- 4. TinyStories JS/WASM (optional kid-story engine) --------------------
//
// This expects some TinyStories library to have been loaded separately,
// attaching a global TinyStories object with an async generate(prompt, opts) or run(opts).

if (typeof window !== "undefined" && window.Forge) {
  window.Forge.registerLLM("tinystories", {
    name: "TinyStories (JS/WASM)",
    ready() {
      return (
        typeof window.TinyStories !== "undefined" &&
        (typeof window.TinyStories.generate === "function" ||
          typeof window.TinyStories.run === "function")
      );
    },
    async init() {
      // assume TinyStories has already initialized itself when script loaded
    },
    async generate({ system = "", prompt = "", stream = false, onToken }) {
      if (
        typeof window.TinyStories === "undefined" ||
        (!window.TinyStories.generate && !window.TinyStories.run)
      ) {
        console.warn(
          "[Forge/LLM tinystories] TinyStories engine not present; load its script first."
        ); return;
      }

      const fullPrompt = system ? system + "\n\n" + prompt : prompt;
      let text = "";

      if (typeof window.TinyStories.generate === "function") {
        text = await window.TinyStories.generate(fullPrompt, { max_tokens: 220 });
      } else {
        const out = await window.TinyStories.run({ prompt: fullPrompt, maxLength: 220 });
        text = typeof out === "string" ? out : String(out);
      }

      text = text.trim();

      if (stream && typeof onToken === "function") {
        onToken(text, text, null);
      }

      return { text };
    },
  });

  // === GLM-4.6 (Zhipu / OpenAI-compatible) ===
  // Configuration:
  //   - localStorage.ZAI_API_KEY or localStorage.GLM_API_KEY (or window.ZAI_API_KEY / window.GLM_API_KEY)
  //   - localStorage.ZAI_API_BASE or localStorage.GLM_API_BASE (optional)
  //
  // Defaults attempt Zhipu "open.bigmodel.cn" first.
  window.Forge.registerLLM("glm-4.6", {
    name: "GLM-4.6 (Zhipu)",
    ready() { return true; },
    async init() {},
    async generate({ system = "", prompt = "", messages = null, stream = false, onToken }) {
      const key =
        (typeof localStorage !== "undefined" && (localStorage.getItem("ZAI_API_KEY") || localStorage.getItem("GLM_API_KEY"))) ||
        (typeof window !== "undefined" && (window.ZAI_API_KEY || window.GLM_API_KEY)) ||
        "";

      const base =
        (typeof localStorage !== "undefined" && (localStorage.getItem("ZAI_API_BASE") || localStorage.getItem("GLM_API_BASE"))) ||
        (typeof window !== "undefined" && (window.ZAI_API_BASE || window.GLM_API_BASE)) ||
        "https://open.bigmodel.cn/api/paas/v4";

      const endpoint = base.replace(/\/+$/,"") + "/chat/completions";

      if (!key) {
        const __err = "[Forge/LLM glm-4.6] Missing API key. Set localStorage.ZAI_API_KEY (or localStorage.GLM_API_KEY).";
        console.warn(__err);
        try { if (typeof onToken === "function") onToken("", "", { error: __err }); } catch (e) {}
        return { text: "", error: __err };
      }

      const outMessages = [];
      if (system) outMessages.push({ role: "system", content: system });

      if (Array.isArray(messages) && messages.length) {
        for (const m of messages) {
          if (!m) continue;
          const role = m.role || "user";
          const content = typeof m.content === "string" ? m.content : String(m.content ?? "");
          outMessages.push({ role, content });
        }
      } else if (prompt) {
        outMessages.push({ role: "user", content: prompt });
      }

      const body = { model: "glm-4.6", stream: !!(stream && typeof onToken === "function"), messages: outMessages };
      const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + key };

      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const _msg = "[Forge/LLM glm-4.6] HTTP " + res.status + " " + res.statusText + (errText ? " — " + errText.slice(0, 400) : "");
        console.warn(_msg);
        if (stream && typeof onToken === "function") { try { onToken("", "", { error: _msg }); } catch (e) {} }
        return { text: "", error: _msg, raw: { status: res.status, statusText: res.statusText, body: errText } };
      }

      if (!body.stream) {
        const data = await res.json();
        const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
        return { text, raw: data };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let full = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === "data: [DONE]" || trimmed === "[DONE]") break;

          const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
          if (!payload) continue;

          try {
            const json = JSON.parse(payload);
            const delta = (json && json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) || "";
            if (delta) {
              full += delta;
              try { onToken(delta, full, json); } catch (e) {}
            }
          } catch (e) {}
        }
      }

      return { text: full, raw: { streamed: true } };
    }
  });

}
