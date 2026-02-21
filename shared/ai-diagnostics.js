// ai-diagnostics.js
// Tiny helper to inspect AI plumbing across your apps.
//
// Include with:
//   <script src="ai-diagnostics.js"></script>
//
// Then, in dev builds, you can either:
//   1) Inspect programmatically:
//        const status = AIDiagnostics.getStatus();
//        console.log(status);
//   2) Render a little card somewhere in your UI:
//        AIDiagnostics.renderStatusCard("ai-diag-slot", { appId: "abyss" });
//
// This will NOT change behavior of your apps. It just reports what it sees.

(function (global) {
  if (!global) return;

  const diag = {};

  function hasForge() {
    return typeof global.Forge !== "undefined" && !!global.Forge;
  }

  function hasForgeChat() {
    return hasForge() && typeof global.Forge.chat === "function";
  }

  function hasWebLLM() {
    return (
      typeof global.webllm !== "undefined" &&
      global.webllm &&
      (typeof global.webllm.CreateEngine === "function" ||
        typeof global.webllm.CreateMLCEngine === "function")
    );
  }

  function hasTransformers() {
    return (
      typeof global.transformers !== "undefined" &&
      global.transformers &&
      typeof global.transformers.pipeline === "function"
    );
  }

  let lastOllamaCheck = null;

  async function checkOllama() {
    const info = {
      checkedAt: new Date().toISOString(),
      ok: false,
      status: null,
      error: null
    };

    try {
      const res = await fetch("http://localhost:11434/api/tags", {
        method: "GET"
      });
      info.status = res.status;
      if (res.ok) {
        info.ok = true;
      }
    } catch (err) {
      info.error = String(err);
    }

    lastOllamaCheck = info;
    return info;
  }

  function getStatus() {
    return {
      forge: {
        present: hasForge(),
        chat: hasForgeChat()
      },
      webllm: {
        present: hasWebLLM()
      },
      transformers: {
        present: hasTransformers()
      },
      ollama: lastOllamaCheck,
      env: {
        userAgent: global.navigator && global.navigator.userAgent,
        location: global.location && global.location.href
      }
    };
  }

  function renderStatusCard(target, options) {
    const opts = options || {};
    const appId = opts.appId || "unknown-app";

    let el = null;
    if (typeof target === "string") {
      el = global.document && global.document.getElementById(target);
    } else {
      el = target;
    }
    if (!el || !global.document) return;

    const s = getStatus();

    const card = global.document.createElement("div");
    card.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    card.style.fontSize = "12px";
    card.style.padding = "8px 10px";
    card.style.borderRadius = "8px";
    card.style.border = "1px solid rgba(255,255,255,0.12)";
    card.style.background = "rgba(0,0,0,0.6)";
    card.style.color = "#f5f5f5";
    card.style.maxWidth = "360px";

    card.innerHTML = "" +
      "<div style='font-weight:600;margin-bottom:4px;'>AI Diagnostics · " + appId + "</div>" +
      "<div style='opacity:0.8;margin-bottom:6px;'>Quick view of Forge / local AI engines for this page.</div>" +
      "<div><strong>Forge SDK:</strong> " + (s.forge.present ? "present" : "not detected") + "</div>" +
      "<div><strong>Forge.chat:</strong> " + (s.forge.chat ? "available" : "not available") + "</div>" +
      "<div><strong>WebLLM:</strong> " + (s.webllm.present ? "loaded" : "not loaded") + "</div>" +
      "<div><strong>transformers.js:</strong> " + (s.transformers.present ? "loaded" : "not loaded") + "</div>" +
      "<div style='margin-top:4px;'><strong>Ollama (last check):</strong> " +
      (s.ollama
        ? (s.ollama.ok
            ? "reachable (status " + s.ollama.status + ")"
            : (s.ollama.status
                ? "unreachable (status " + s.ollama.status + ")"
                : "error / not reachable"))
        : "not checked yet") +
      "</div>" +
      "<button type='button' id='ai-diag-ollama-btn' " +
      "style='margin-top:6px;padding:4px 8px;font-size:11px;border-radius:6px;border:none;" +
      "background:#3b82f6;color:white;cursor:pointer;'>Check Ollama now</button>" +
      "<div id='ai-diag-ollama-status' style='margin-top:4px;opacity:0.8;'></div>";

    el.innerHTML = "";
    el.appendChild(card);

    const btn = card.querySelector("#ai-diag-ollama-btn");
    const statusEl = card.querySelector("#ai-diag-ollama-status");

    if (btn && statusEl) {
      btn.addEventListener("click", async () => {
        statusEl.textContent = "Checking Ollama at http://localhost:11434…";
        const info = await checkOllama();
        if (info.ok) {
          statusEl.textContent = "Ollama reachable (status " + info.status + ").";
        } else if (info.status) {
          statusEl.textContent = "Ollama responded with status " + info.status + ".";
        } else {
          statusEl.textContent = "Ollama not reachable / CORS blocked.";
        }
      });
    }
  }

  diag.getStatus = getStatus;
  diag.checkOllama = checkOllama;
  diag.renderStatusCard = renderStatusCard;

  global.AIDiagnostics = diag;
})(typeof window !== "undefined" ? window : this);
