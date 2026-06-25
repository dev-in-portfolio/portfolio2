// AgentX demo UI helpers
// Fixes: robust base-path detection + friendly errors when JSON assets fail to load.

const __AGENTX_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
const __AGENTX_SCRIPT_URL = __AGENTX_SCRIPT_SRC ? new URL(__AGENTX_SCRIPT_SRC, window.location.href) : null;

// If this file lives at:  /agents/assets/js/agents.js  => base = /agents
// If it lives at:       /assets/js/agents.js         => base = ""
const AGENTX_BASE = (__AGENTX_SCRIPT_URL ? __AGENTX_SCRIPT_URL.pathname : window.location.pathname)
  .replace(/\/assets\/js\/agents\.js$/, "")
  .replace(/\/$/, "");

function withBase(p) {
  return (AGENTX_BASE || "") + p;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderError(rootEl, title, err) {
  if (!rootEl) return;
  const msg = err && err.message ? err.message : String(err);
  rootEl.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0">${escapeHtml(title)}</h3>
      <p style="margin:0;color:var(--muted)">${escapeHtml(msg)}</p>
      <div class="sep"></div>
      <p style="margin:0;color:var(--muted)">Tip: open DevTools → Network and check which URL returned 404 or HTML instead of JSON.</p>
    </div>
  `;
}

async function loadJson(pathOrPaths) {
  const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
  let lastErr = null;

  for (const path of paths) {
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      const text = await r.text();

      // If Netlify/SPAs rewrite a JSON request to an HTML page, fail loudly.
      if (text.trim().startsWith("<")) {
        throw new Error(`Non-JSON response (content-type: ${ct || "unknown"})`);
      }

      return JSON.parse(text);
    } catch (e) {
      lastErr = new Error(`Failed to load ${path}: ${e.message}`);
    }
  }

  throw lastErr || new Error("Failed to load JSON");
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function packName(letter) {
  const map = {
    A: "Pack A",
    B: "Pack B",
    C: "Pack C",
    D: "Pack D",
    E: "Pack E",
    F: "Pack F",
    G: "Pack G",
    H: "Pack H",
    I: "Pack I",
    J: "Pack J",
    K: "Pack K",
    L: "Pack L",
    Z: "Pack Z",
  };
  return map[letter] || `Pack ${letter}`;
}

function permList(perms) {
  return `<div class="kv">${perms.map((p) => `<span class="tag">${p}</span>`).join("")}</div>`;
}

function agentCard(a) {
  const status =
    a.demoStatus === "demo"
      ? `<span class="tag ok">Demo</span>`
      : a.demoStatus === "not-enabled"
        ? `<span class="tag bad">Not enabled</span>`
        : a.demoStatus === "spec"
          ? `<span class="tag warn">Spec</span>`
          : `<span class="tag">Local-only</span>`;

  return `
  <a class="card" href="${withBase(`/store/${a.slug}.html`)}" style="text-decoration:none">
    <h3>${a.name}</h3>
    <p>${a.purpose}</p>
    <div class="kv">
      <span class="tag">${packName(a.pack)}</span>
      ${status}
      <span class="tag">ID ${a.id}</span>
    </div>
  </a>`;
}

async function renderStore() {
  const grid = qs("#agentGrid");
  const filter = qs("#packFilter");

  if (!grid || !filter) return;

  try {
    const agents = await loadJson([
      withBase("/assets/data/agents.json"),
      "/apps/agents/assets/data/agents.json",
      "../assets/data/agents.json",
      "./assets/data/agents.json"
    ]);

    function apply() {
      // In the HTML, "All Packs" uses value="".
      const v = filter.value;
      const list = !v ? agents : agents.filter((a) => a.pack === v);

      grid.innerHTML = list.length
        ? list.map(agentCard).join("")
        : `<div class="card"><p style="margin:0;color:var(--muted)">No agents match this pack filter.</p></div>`;
    }

    filter.addEventListener("change", apply);
    apply();
  } catch (e) {
    renderError(grid, "Store data failed to load", e);
    console.error(e);
  }
}

async function renderPacks() {
  const root = qs("#packsRoot");
  if (!root) return;

  try {
    const packs = await loadJson([
      withBase("/assets/data/packs.json"),
      "/apps/agents/assets/data/packs.json",
      "../assets/data/packs.json",
      "./assets/data/packs.json"
    ]);

    const agents = await loadJson([
      withBase("/assets/data/agents.json"),
      "/apps/agents/assets/data/agents.json",
      "../assets/data/agents.json",
      "./assets/data/agents.json"
    ]);

    root.innerHTML = packs
      .map((p) => {
        const list = p.agents
          .map((slug) => agents.find((a) => a.slug === slug))
          .filter(Boolean);
        const perms = Array.from(new Set(list.flatMap((a) => a.permissions))).sort();

        const packZipHref = withBase(`/assets/packs/${p.slug}.agentpack.zip`);
        const packPageHref = withBase(`/packs/${p.slug}.html`);
        const memeHref = withBase(`/assets/packs/no-soup-for-you.png`);

        return `
        <div class="card">
          <h3>${p.name}</h3>
          <p>${list.length} agents • permissions summary below</p>
          <div class="kv">
            ${
              p.slug === "pack-z"
                ? `<a class="btn primary" href="${packZipHref}" download>Download ${p.slug}.agentpack.zip</a>
                   <a class="btn" href="${memeHref}" download>Download image</a>`
                : `<a class="btn primary" href="${packZipHref}" download>Download ${p.slug}.agentpack.zip</a>`
            }
            <a class="btn" href="${packPageHref}">Open pack page</a>
          </div>
          ${permList(perms)}
        </div>
      `;
      })
      .join("");
  } catch (e) {
    renderError(root, "Packs data failed to load", e);
    console.error(e);
  }
}

window.AgentPages = { renderStore, renderPacks };
