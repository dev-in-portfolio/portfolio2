// ai-router.js (clean)
// Provides: window.AIAdvisorRouter.runAdvisor(options)
//
// This is the ONLY thing the portfolio apps need for "AI Advisor" buttons.
// It calls ./ai_proxy.php (server-side) so visitors don't need keys in the browser.
//
// Back-compat: apps may pass { roleName, baseNarrative, ctx } (older style)
// New: apps may pass { appId, role, persona, userPrompt } for unified personas/templates.

(function () {
  "use strict";

  const ENDPOINT = "./ai_proxy.php";
  const DEFAULT_MODEL = "llama-3.3-70b-versatile";

  async function loadFallbackScript() {
    try {
      if (window.AIFallback && typeof window.AIFallback.answer === "function") return true;
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "./ai-fallback.js?v=" + Date.now();
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load ai-fallback.js"));
        document.head.appendChild(s);
      });
      return !!(window.AIFallback && typeof window.AIFallback.answer === "function");
    } catch (_) {
      return false;
    }
  }

  async function runOfflineFallback(o, reason) {
    const ok = await loadFallbackScript();
    if (!ok) return null;

    try {
      const appId =
        (o && (o.appId || o.labId)) ||
        (window.LAB_SHELL_CONFIG && (window.LAB_SHELL_CONFIG.appId || window.LAB_SHELL_CONFIG.id)) ||
        ((location.pathname || "").split("/").pop() || "");

      const persona = (o && (o.persona || o.role || o.roleName)) || "navigator";
      const prompt = (o && (o.userPrompt || o.prompt)) || "";

      const ans = await window.AIFallback.answer({ appId, persona, userPrompt: prompt, reason });
      if (!ans) return null;

      const banner = "Offline fallback active (" + String(reason || "AI unavailable") + ").";
      return [banner, "", ans].join("\n");
    } catch (_) {
      return null;
    }
  }

  const DISCLAIMER_KEY = "ai_disclaimer_shown_v1";
  const DISCLAIMER_TEXT =
    "Note: AI output is experimental. Verify critical info. Don’t paste secrets (API keys, passwords, client data).";

  function safeFn(fn) {
    return typeof fn === "function" ? fn : () => {};
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return ""; }
  }

  function clamp(n, lo, hi) {
    const x = Number(n);
    if (!isFinite(x)) return lo;
    return Math.max(lo, Math.min(hi, x));
  }

  function normalizeRole(role, roleName) {
    const r0 = String(role || roleName || "default").toLowerCase().trim();
    if (r0.includes("coach")) return "coach";
    if (r0.includes("critic")) return "critic";
    if (r0.includes("navigator") || r0.includes("nav")) return "navigator";
    if (r0.includes("idea")) return "idea-scout";
    if (r0 === "default" || r0 === "") return "default";
    // If caller passes an unknown role label, keep it as-is so personas can define it.
    return r0;
  }

  function compactJson(obj, maxLen) {
    const limit = Math.max(200, maxLen || 1400);
    try {
      const raw = JSON.stringify(obj, (k, v) => {
        if (typeof v === "function") return "[Function]";
        if (v instanceof Element) return "[DOM Element]";
        return v;
      });
      if (!raw) return "";
      if (raw.length <= limit) return raw;
      return raw.slice(0, limit) + "…";
    } catch (_) {
      return "";
    }
  }

  function isPlainObject(x){
    return !!x && typeof x === "object" && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
  }

  function safeCall(fn, fallback){
    try{
      if (typeof fn === "function") return fn();
    }catch(_e){}
    return fallback;
  }

  function getContractContext(){
    // Contract (optional): apps can expose:
    //   window.getLabAIContext() -> object|string
    //   window.LAB_AI_CONTEXT = object|string
    //   window.LAB_SHELL_CONFIG.aiContext = object|string
    //   window.LAB_SHELL_CONFIG.getContext() -> object|string
    try{
      if (typeof window !== "undefined"){
        const a = safeCall(window.getLabAIContext, null);
        if (a) return a;

        const b = window.LAB_AI_CONTEXT;
        if (b) return b;

        const cfg = window.LAB_SHELL_CONFIG;
        if (cfg){
          if (cfg.aiContext) return cfg.aiContext;
          const c = safeCall(cfg.getContext, null);
          if (c) return c;
        }
      }
    }catch(_e){}
    return null;
  }

  function scanControls(){
    // Lightweight DOM scan for visible controls (range/select/checkbox/etc.)
    // Caps counts to avoid huge prompts.
    try{
      if (typeof document === "undefined") return null;
      const controls = [];
      const nodes = Array.from(document.querySelectorAll("input, select, textarea"));
      for (const n of nodes){
        if (controls.length >= 40) break;

        // Skip hidden/irrelevant
        const t = (n.getAttribute("type") || "").toLowerCase();
        if (t === "hidden" || n.disabled) continue;
        if (n.offsetParent === null && getComputedStyle(n).position !== "fixed") continue;

        let label = "";
        const id = n.getAttribute("id");
        if (id){
          const l = document.querySelector(`label[for="${CSS && CSS.escape ? CSS.escape(id) : id}"]`);
          if (l) label = (l.textContent || "").trim();
        }
        if (!label){
          const wrap = n.closest("label");
          if (wrap) label = (wrap.textContent || "").trim();
        }
        if (!label) label = (n.getAttribute("aria-label") || n.getAttribute("name") || n.getAttribute("id") || n.getAttribute("placeholder") || "").trim();
        if (!label) continue;

        // normalize label
        label = label.replace(/\s+/g, " ").slice(0, 60);

        let value;
        if (t === "checkbox") value = !!n.checked;
        else if (t === "range" || t === "number") value = n.value;
        else if (n.tagName === "SELECT") value = (n.value || "").toString();
        else value = (n.value || "").toString();

        // avoid huge strings
        if (typeof value === "string") value = value.slice(0, 80);

        controls.push({ label, value });
      }
      return controls.length ? controls : null;
    }catch(_e){
      return null;
    }
  }

  function buildLiveContext(userCtxObj){
    const contract = getContractContext();
    const domControls = scanControls();

    // Support string contexts too
    const out = {};
    if (contract) out.contract = contract;
    if (domControls) out.controls = domControls;
    if (userCtxObj) out.user = userCtxObj;

    return Object.keys(out).length ? out : null;
  }


  function pickPersona(appId, roleKey, explicitPersona) {
    if (explicitPersona && String(explicitPersona).trim()) return String(explicitPersona).trim();

    try {
      if (typeof window !== "undefined" && window.AIPersonas && typeof window.AIPersonas.getPersona === "function") {
        const p = window.AIPersonas.getPersona(appId, roleKey);
        if (p && String(p).trim()) return String(p).trim();
      }
    } catch (_) {}
    return "";
  }

  function roleTemplate(roleKey) {
    if (roleKey === "coach") {
      return [
        "You are the COACH.",
        "Goal: walk the user through the app step-by-step.",
        "Rules: only reference controls/features that exist on the current page; if something is missing, say so and ask 1 targeted question.",
        "Format: short steps; include expected result after each step."
      ].join("\n");
    }
    if (roleKey === "critic") {
      return [
        "You are the CRITIC.",
        "Goal: identify fragile assumptions, confusing UI, and likely bugs based on what is visible in the app/code.",
        "Rules: propose minimal safe patches (no rewrites); call out performance traps and edge-cases.",
        "Format: bullets are OK; include 'Fix' + 'Why' per item."
      ].join("\n");
    }
    if (roleKey === "navigator") {
      return [
        "You are the NAVIGATOR.",
        "Goal: orient the user quickly and tell them what to click next.",
        "Rules: keep it grounded to the UI; point to labels/buttons as they appear; avoid jargon.",
        "Format: a quick map (where you are / what matters) then 3 next actions."
      ].join("\n");
    }
    if (roleKey === "idea-scout") {
      return [
        "You are the IDEA SCOUT.",
        "Goal: suggest small scope-safe enhancements that reuse existing UI/components.",
        "Rules: no refactors; no new dependencies; keep changes incremental and reversible.",
        "Format: 3–7 ideas; each with a 1-line benefit."
      ].join("\n");
    }
    return [
      "You are a helpful embedded AI advisor.",
      "Rules: only reference controls/features visible in the current page; if something is missing, ask 1 targeted question."
    ].join("\n");
  }

  function buildMessages(options) {
    const o = options || {};
    const appId = String(o.appId || "").trim();
    const roleKey = normalizeRole(o.role, o.roleName);
    const persona = pickPersona(appId, roleKey, o.persona);
    const baseNarrative = (o.baseNarrative || "").trim();

    const userCtxText =
      typeof o.ctx === "string" ? o.ctx.trim() : "";

    const userCtxObj =
      (o.ctx && typeof o.ctx === "object") ? o.ctx : null;

    const liveCtxObj = buildLiveContext(userCtxObj);

    const ctxText = liveCtxObj ? compactJson(liveCtxObj, 1700) : "";

    const pageCtx = (typeof window !== "undefined") ? {
      title: document && document.title ? document.title : "",
      path: location && location.pathname ? location.pathname : "",
      href: location && location.href ? location.href : "",
      viewport: (typeof innerWidth === "number" && typeof innerHeight === "number") ? `${innerWidth}x${innerHeight}` : ""
    } : {};

    const systemParts = [
      roleTemplate(roleKey),
      persona ? ("\nPersona:\n" + persona) : "",
      baseNarrative ? ("\nBase narrative / lab snapshot:\n" + baseNarrative) : "",
      userCtxText ? ("\nUser notes (freeform):\n" + userCtxText) : "",
      ctxText ? ("\nLive context snapshot (may be partial):\n" + ctxText) : "",
      appId ? ("\nAppId: " + appId) : "",
      (pageCtx && (pageCtx.title || pageCtx.path || pageCtx.viewport))
        ? ("\nPage:\n" + compactJson(pageCtx, 600))
        : "",
      "\nOutput rules: be concise, useful, and actionable.",
      "Time: " + nowIso()
    ].filter(Boolean).join("\n");

    const userPrompt =
      (o.userPrompt && String(o.userPrompt).trim())
        ? String(o.userPrompt).trim()
        : (ctxText ? "Use the context snapshot to help me with the current screen." : "Help me with the current screen / request.");

    return [
      { role: "system", content: systemParts },
      { role: "user", content: userPrompt }
    ];
  }

  function extractAssistantText(data) {
    try {
      if (data && data.choices && data.choices[0] && data.choices[0].message && typeof data.choices[0].message.content === "string") {
        return data.choices[0].message.content;
      }
    } catch (_) {}
    return "";
  }

  function maybeAppendDisclaimer(text) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return text;
      if (localStorage.getItem(DISCLAIMER_KEY)) return text;
      localStorage.setItem(DISCLAIMER_KEY, "1");
      return (text || "").trim() + "\n\n—\n" + DISCLAIMER_TEXT;
    } catch (_) {
      return text;
    }
  }

  async function runAdvisor(options) {
    const o = options || {};
    const ui = o.ui || {};
    const setText = safeFn(ui.setText);
    const setStatus = safeFn(ui.setStatus);
    const log = safeFn(ui.log);
    const onDone = safeFn(ui.onDone);

    setStatus("Thinking…");
    setText("");

    const payload = {
      model: o.model || DEFAULT_MODEL,
      messages: buildMessages(o),
      temperature: clamp(o.temperature != null ? o.temperature : 0.6, 0, 1.2),
      max_tokens: clamp(o.max_tokens != null ? o.max_tokens : 700, 64, 1200)
    };

    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const txt = await r.text();
      let data = null;
      try { data = JSON.parse(txt); } catch (_) {}

      if (!r.ok) {
        const msg =
          (data && data.error && (data.error.message || data.error)) ||
          (data && data.message) ||
          txt ||
          `Request failed (${r.status})`;

        // Friendly handling for "not configured" + rate limits
        if (String(msg).toLowerCase().includes("not configured") || r.status === 412) {
          const offline = await runOfflineFallback(o, "not configured");
          if (offline) {
            setText(offline);
            setStatus("Offline");
            onDone(offline);
            return offline;
          }

          const friendly = [
            "AI proxy not configured.",
            "Edit /private/keys.php and paste your Groq API key.",
            "(Template: /private/keys.php.example)",
            "",
            "Details:",
            String(msg)
          ].join("\n");
          setText(friendly);
          setStatus("Needs setup");
          onDone(friendly);
          return friendly;
        }

        if (r.status === 429) {
          const offline = await runOfflineFallback(o, "rate limited");
          if (offline) {
            setText(offline);
            setStatus("Offline");
            onDone(offline);
            return offline;
          }

          const friendly = [
            "Rate limit hit (temporary).",
            "Try again in a moment.",
            "",
            "Details:",
            String(msg)
          ].join("\n");
          setText(friendly);
          setStatus("Cooling down");
          onDone(friendly);
          return friendly;
        }

        {
          const offline = await runOfflineFallback(o, "server error");
          if (offline) {
            setText(offline);
            setStatus("Offline");
            onDone(offline);
            return offline;
          }

          setText(String(msg));
          setStatus("Error");
          onDone(String(msg));
          return String(msg);
        }
      }

      const out = maybeAppendDisclaimer(extractAssistantText(data) || txt || "");
      setText(out);
      setStatus(data && data.cached ? "Done (cached)" : "Done");
      onDone(out);
      return out;
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      // Network / fetch failure — try offline fallback
      const offline = await runOfflineFallback(o, "network error");
      if (offline) {
        setText(offline);
        setStatus("Offline");
        onDone(offline);
        return offline;
      }

      log(msg);
      setText(msg);
      setStatus("Error");
      onDone(msg);
      return msg;
    }
  }

  window.AIAdvisorRouter = window.AIAdvisorRouter || { runAdvisor };
})();