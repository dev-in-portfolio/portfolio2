// ai-fallback.js — offline FAQ fallback (Phase 2: externalized JSON + synonyms + top-3 suggestions)
// Provides: window.AIFallback.ensureLoaded(), window.AIFallback.answer({appId, persona, userPrompt})
(function () {
  "use strict";

  const DB_URL = "./ai-fallback-faq.json";
  let _db = null;
  let _loading = null;

  // caches per appId: [{ item, tokSet }]
  const _appCache = Object.create(null);
  let _syn = null;         // forward map
  let _synRev = null;      // reverse map (value -> keys that include it)
  let _phraseKeys = null;  // synonym keys/vals containing spaces

  const STOP = new Set([
    "the","and","or","to","of","in","a","an","is","it","for","on","with","as","at","by","from","this","that","these","those",
    "what","how","why","can","i","do","does","should","we","you","your","are","be","been","into","when","then","than","so","if"
  ]);

  function safeLower(s) { return String(s || "").toLowerCase(); }

  function stripHtml(s) {
    return String(s || "").replace(/<[^>]*>/g, " ");
  }

  function tokenize(s) {
    return safeLower(stripHtml(s))
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter(t => !STOP.has(t))
      .slice(0, 120);
  }

  function normalizeToken(t) {
    const s = String(t || "");
    if (!s) return "";
    // tiny singularization (very light)
    if (s.length > 4 && s.endsWith("s")) return s.slice(0, -1);
    return s;
  }

  function buildSynIndex(db) {
    const syn = (db && db.synonyms) ? db.synonyms : {};
    _syn = syn || {};
    _synRev = Object.create(null);
    _phraseKeys = [];

    function addRev(key, val) {
      const v = safeLower(val);
      if (!_synRev[v]) _synRev[v] = [];
      _synRev[v].push(key);
    }

    for (const k in _syn) {
      const key = safeLower(k);
      const arr = Array.isArray(_syn[k]) ? _syn[k] : [];
      if (key.includes(" ")) _phraseKeys.push(key);
      for (const v of arr) {
        const vv = safeLower(v);
        addRev(key, vv);
        if (vv.includes(" ")) _phraseKeys.push(vv);
      }
    }
    // de-dupe phrases
    _phraseKeys = Array.from(new Set(_phraseKeys)).sort((a,b)=>b.length-a.length).slice(0, 120);
  }

  function expandTokens(baseTokens, fullTextLower) {
    const out = new Set();
    const add = (t) => { if (t) out.add(normalizeToken(t)); };

    for (const t of baseTokens) add(t);

    // phrase hits (adds phrase words as tokens)
    if (_phraseKeys && fullTextLower) {
      for (const ph of _phraseKeys) {
        if (ph && fullTextLower.includes(ph)) {
          for (const w of ph.split(/\s+/)) add(w);
        }
      }
    }

    // synonym expansion (both directions)
    const snapshot = Array.from(out);
    for (const t of snapshot) {
      const key = safeLower(t);

      // forward
      const f = _syn && _syn[key];
      if (Array.isArray(f)) for (const v of f) for (const w of String(v).split(/\s+/)) add(w);

      // reverse
      const r = _synRev && _synRev[key];
      if (Array.isArray(r)) for (const k of r) for (const w of String(k).split(/\s+/)) add(w);
    }

    return out;
  }

  function normAppId(appId) {
    const s = String(appId || "").trim();
    if (!s) return "";
    return s.replace(/\.html?$/i, "");
  }

  function scoreSets(a, b) {
    // cosine-ish overlap: hit / sqrt(|a||b|)
    if (!a || !b) return 0;
    const small = (a.size <= b.size) ? a : b;
    const big = (a.size <= b.size) ? b : a;
    let hit = 0;
    for (const t of small) if (big.has(t)) hit++;
    if (!hit) return 0;
    return hit / Math.sqrt(Math.max(1, a.size) * Math.max(1, b.size));
  }

  async function ensureLoaded() {
    if (_db) return _db;
    if (_loading) return _loading;
    _loading = (async () => {
      const r = await fetch(DB_URL, { cache: "no-store" });
      const j = await r.json();
      _db = j && j.apps ? j : null;
      buildSynIndex(_db);
      return _db;
    })();
    return _loading;
  }

  function personaWrap(text, persona) {
    const p = safeLower(persona);
    if (!text) return text;

    if (p.includes("coach")) {
      return [
        text.trim(),
        "",
        "Coach mode — quick next steps:",
        "1) Start from default/preset.",
        "2) Change ONE control at a time and observe.",
        "3) Snapshot a good state so it’s reproducible."
      ].join("\n");
    }

    if (p.includes("critic")) {
      return [
        text.trim(),
        "",
        "Critic mode — common pitfalls:",
        "• Changing too many controls at once (you lose cause/effect).",
        "• Pushing everything to max (makes it look broken or noisy).",
        "• Forgetting to reset/snapshot (hard to reproduce)."
      ].join("\n");
    }

    return text.trim(); // Navigator / default
  }

  function buildAppCache(appBlock) {
    const items = [];
    const faqs = appBlock && (appBlock.faqs || appBlock.qas) ? (appBlock.faqs || appBlock.qas) : [];
    for (const it of faqs) {
      const q = String(it.q || "");
      const a = String(it.a || "");
      const tags = Array.isArray(it.tags) ? it.tags.join(" ") : "";
      const aliases = Array.isArray(it.aliases) ? it.aliases.join(" ") : "";
      const raw = [q, tags, aliases].join(" ").trim();
      items.push({ item: { q, a, tags: it.tags, aliases: it.aliases }, raw });
    }
    return items;
  }

  function bestMatches(appId, appBlock, userPrompt) {
    const text = String(userPrompt || "").trim();
    const textLower = safeLower(text);
    const uBase = tokenize(textLower);
    const uSet = expandTokens(uBase, textLower);

    if (!_appCache[appId]) {
      _appCache[appId] = buildAppCache(appBlock).map(x => {
        const qt = tokenize(x.raw);
        const qSet = expandTokens(qt, safeLower(x.raw));
        return { item: x.item, set: qSet };
      });
    }

    const scored = [];
    for (const row of _appCache[appId]) {
      const s = scoreSets(uSet, row.set);
      if (s > 0) scored.push({ s, item: row.item });
    }
    scored.sort((a,b)=>b.s-a.s);
    return { scored, uCount: uSet.size };
  }

  function formatTop3(scored, persona) {
    const top = scored.slice(0, 3);
    if (!top.length) return null;

    const lines = [];
    lines.push("I found a few similar questions:");
    top.forEach((m, i) => {
      lines.push((i+1) + ") " + m.item.q);
    });
    lines.push("");
    top.forEach((m, i) => {
      lines.push("— " + (i+1) + " — " + m.item.q);
      // keep #2/#3 a bit shorter to avoid walls of text
      const ans = String(m.item.a || "").trim();
      const cap = (i === 0) ? 1200 : 650;
      lines.push(ans.length > cap ? (ans.slice(0, cap).trim() + "…") : ans);
      lines.push("");
    });
    return personaWrap(lines.join("\n").trim(), persona);
  }

  async function answer(opts) {
    const o = opts || {};
    const appId = normAppId(o.appId) || normAppId(o.labId) || normAppId((location.pathname || "").split("/").pop());
    const persona = o.persona || o.role || o.roleName || "navigator";
    const userPrompt = String(o.userPrompt || o.prompt || "").trim();

    if (!userPrompt) {
      return "Ask a question about this lab (controls, what it demonstrates, performance, mobile use, or how to demo it).";
    }

    let db = _db;
    try { if (!db) db = await ensureLoaded(); } catch (_) {}

    if (!db || !db.apps) {
      return "Offline fallback is available, but the FAQ database could not be loaded.";
    }

    const appBlock =
      db.apps[appId] ||
      db.apps[appId.charAt(0).toUpperCase() + appId.slice(1)] ||
      null;

    if (!appBlock) {
      return personaWrap("Offline fallback is active, but no FAQ block was found for this lab.", persona);
    }

    const { scored, uCount } = bestMatches(appId, appBlock, userPrompt);

    // If nothing scored, show app summary + suggestions
    if (!scored.length) {
      const intro = appBlock.summary ? (String(appBlock.summary).trim() + "\n\n") : "";
      return personaWrap(
        intro + "Offline fallback is active. Try asking about: what it demonstrates, performance, mobile use, controls, or how to get a strong demo moment.",
        persona
      );
    }

    const top1 = scored[0];
    const top2 = scored[1] || null;

    // low confidence triggers top-3 mode:
    // - very short prompt
    // - low absolute score
    // - ambiguous (top1 close to top2)
    const lowAbs = top1.s < 0.18;
    const shortPrompt = uCount <= 4;
    const ambiguous = !!(top2 && top1.s < 0.30 && (top1.s - top2.s) < 0.05);

    if (lowAbs || shortPrompt || ambiguous) {
      const multi = formatTop3(scored, persona);
      if (multi) return multi;
    }

    // confident best match
    const intro = appBlock.summary ? (String(appBlock.summary).trim() + "\n\n") : "";
    return personaWrap(intro + String(top1.item.a || "").trim(), persona);
  }

  window.AIFallback = window.AIFallback || { ensureLoaded, answer };
})();
