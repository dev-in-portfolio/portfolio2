// AgentX demo UI helpers
// Canonical runtime contract:
// - public pages live under /apps/agents/*
// - assets resolve relative to the mounted Agents root for clone safety

const AGENTX_PUBLIC_BASE = "/apps/agents";
const AGENTX_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
const AGENTX_SCRIPT_URL = AGENTX_SCRIPT_SRC ? new URL(AGENTX_SCRIPT_SRC, window.location.href) : null;
const AGENTX_BASE = (AGENTX_SCRIPT_URL ? AGENTX_SCRIPT_URL.pathname : window.location.pathname)
  .replace(/\/assets\/js\/agents\.js$/, "")
  .replace(/\/$/, "");

function withBase(p) {
  return `${AGENTX_BASE || AGENTX_PUBLIC_BASE}${p}`;
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
      <p style="margin:0;color:var(--muted)">Tip: check which asset URL returned 404 or HTML instead of JSON.</p>
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

function statusLabel(status) {
  const map = {
    demo: "Demo",
    "not-enabled": "Locked",
    spec: "Spec",
    "local-only": "Local-only",
  };
  return map[status] || "Local-only";
}

function statusTag(status) {
  const cls =
    status === "demo"
      ? "ok"
      : status === "not-enabled"
        ? "bad"
        : status === "spec"
          ? "warn"
          : "";
  return `<span class="tag ${cls}">${statusLabel(status)}</span>`;
}

function riskLevel(a) {
  const perms = a.permissions || [];
  if (a.demoStatus === "not-enabled") return "Locked";
  if (perms.some((p) => /approval\.high|secrets\.read|crypto\.sign|local\.exec/.test(p))) return "High review";
  if (perms.some((p) => /write|browser\.automation|network|secrets|approval/.test(p))) return "Guarded";
  return "Low";
}

function packMeta(packs, letter) {
  return packs.find((p) => p.slug === `pack-${String(letter).toLowerCase()}`);
}

function permList(perms) {
  return `<div class="kv">${perms.map((p) => `<span class="tag">${p}</span>`).join("")}</div>`;
}

function agentCard(a) {
  return `
  <a class="card" href="${withBase(`/store/${a.slug}.html`)}" data-agent-slug="${escapeHtml(a.slug)}" style="text-decoration:none">
    <h3>${a.name}</h3>
    <p>${a.purpose}</p>
    <div class="kv">
      <span class="tag">${packName(a.pack)}</span>
      ${statusTag(a.demoStatus)}
      <span class="tag">${riskLevel(a)}</span>
      <span class="tag">ID ${a.id}</span>
    </div>
  </a>`;
}

function renderSummary(root, agents, packs) {
  if (!root) return;
  const demoCount = agents.filter((a) => a.demoStatus === "demo").length;
  const localCount = agents.filter((a) => a.demoStatus === "local-only").length;
  const permissionCount = new Set(agents.flatMap((a) => a.permissions || [])).size;

  root.innerHTML = `
    <div class="metric"><b>${packs.length}</b><span>downloadable packs</span></div>
    <div class="metric"><b>${agents.length}</b><span>agents indexed</span></div>
    <div class="metric"><b>${demoCount}</b><span>browser demos</span></div>
    <div class="metric"><b>${permissionCount}</b><span>permission scopes</span></div>
  `;

  const localEl = qs("[data-local-agent-count]");
  if (localEl) localEl.textContent = `${localCount} local-first agents`;
}

function renderFeatured(root, agents) {
  if (!root) return;
  const featuredSlugs = [
    "portfolio-checker-agent",
    "playwright-browser-runner",
    "offline-receipts-agent",
    "secret-redaction-agent",
    "release-orchestrator-agent-the-manager",
    "ui-regression-test-agent",
  ];
  const featured = featuredSlugs
    .map((slug) => agents.find((a) => a.slug === slug))
    .filter(Boolean);

  root.innerHTML = featured
    .map(
      (a) => `
      <a class="card is-featured" href="${withBase(`/store/${a.slug}.html`)}" style="text-decoration:none">
        <div class="kv" style="margin-top:0">
          <span class="tag hot">Featured</span>
          <span class="tag">${packName(a.pack)}</span>
          ${statusTag(a.demoStatus)}
        </div>
        <h3 style="margin-top:12px">${a.name}</h3>
        <p>${a.purpose}</p>
      </a>
    `,
    )
    .join("");
}

function renderAgentDetail(root, agent, packs) {
  if (!root || !agent) return;
  const pack = packMeta(packs, agent.pack);
  const outputTags = (agent.outputs || []).map((o) => `<span class="tag">${escapeHtml(o)}</span>`).join("");
  const manifestHref = withBase(`/store/${agent.slug}.html`);
  root.innerHTML = `
    <div class="agent-detail">
      <div class="kv" style="margin-top:0">
        <span class="tag hot">Selected manifest</span>
        <span class="tag">${escapeHtml(pack ? pack.name : packName(agent.pack))}</span>
        ${statusTag(agent.demoStatus)}
        <span class="tag">${riskLevel(agent)}</span>
      </div>
      <h3>${escapeHtml(agent.name)}</h3>
      <p>${escapeHtml(agent.purpose)}</p>
      <div class="kv">
        <a class="btn primary" href="${manifestHref}">Open manifest page</a>
        <a class="btn" href="${withBase(`/packs/pack-${String(agent.pack).toLowerCase()}.html`)}">Open pack</a>
      </div>
      <div class="grid">
        <div class="card"><h3>Permissions</h3>${permList(agent.permissions || [])}</div>
        <div class="card"><h3>Outputs</h3><div class="kv">${outputTags}</div></div>
        <div class="card"><h3>Install path</h3><p><span class="tag">${escapeHtml(agent.slug)}</span></p></div>
      </div>
    </div>
  `;
}

async function renderStore() {
  const grid = qs("#agentGrid");
  const filter = qs("#packFilter");
  const statusFilter = qs("#statusFilter");
  const search = qs("#agentSearch");
  const count = qs("#resultCount");
  const summary = qs("#storeSummary");
  const featured = qs("#featuredAgents");
  const detail = qs("#agentDetail");

  if (!grid || !filter) return;

  try {
    const agents = await loadJson([withBase("/assets/data/agents.json")]);
    const packs = await loadJson([withBase("/assets/data/packs.json")]);
    renderSummary(summary, agents, packs);
    renderFeatured(featured, agents);
    renderAgentDetail(detail, agents.find((a) => a.slug === "portfolio-checker-agent") || agents[0], packs);

    function apply() {
      const packValue = filter.value;
      const statusValue = statusFilter ? statusFilter.value : "";
      const query = search ? search.value.trim().toLowerCase() : "";
      const list = agents.filter((a) => {
        const matchesPack = !packValue || a.pack === packValue;
        const matchesStatus = !statusValue || a.demoStatus === statusValue;
        const haystack = `${a.name} ${a.slug} ${a.purpose} ${(a.permissions || []).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        return matchesPack && matchesStatus && matchesQuery;
      });

      grid.innerHTML = list.length
        ? list.map(agentCard).join("")
        : `<div class="card"><p style="margin:0;color:var(--muted)">No agents match these filters.</p></div>`;
      if (count) count.textContent = `${list.length} agent${list.length === 1 ? "" : "s"} shown`;
    }

    filter.addEventListener("change", apply);
    if (statusFilter) statusFilter.addEventListener("change", apply);
    if (search) search.addEventListener("input", apply);
    grid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-agent-slug]");
      if (!card) return;
      event.preventDefault();
      const agent = agents.find((a) => a.slug === card.dataset.agentSlug);
      renderAgentDetail(detail, agent, packs);
      if (detail) detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
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
    const packs = await loadJson([withBase("/assets/data/packs.json")]);
    const agents = await loadJson([withBase("/assets/data/agents.json")]);

    root.innerHTML = packs
      .map((p) => {
        const list = p.agents
          .map((slug) => agents.find((a) => a.slug === slug))
          .filter(Boolean);
        const perms = Array.from(new Set(list.flatMap((a) => a.permissions))).sort();
        const demoCount = list.filter((a) => a.demoStatus === "demo").length;
        const localCount = list.filter((a) => a.demoStatus === "local-only").length;

        const packZipHref = withBase(`/assets/packs/${p.slug}.agentpack.zip`);
        const packPageHref = withBase(`/packs/${p.slug}.html`);
        const memeHref = withBase(`/assets/packs/no-soup-for-you.png`);

        return `
        <div class="card">
          <h3>${p.name}</h3>
          <p>${list.length} agents • ${demoCount} demo-ready • ${localCount} local-only • permissions summary below</p>
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

async function renderRunReceipt() {
  const root = qs("#runReceipt");
  if (!root) return;
  try {
    const receipt = await loadJson([withBase("/assets/sample-runs/sample_run_001.receipts.json")]);
    const steps = receipt.steps || [];
    const logs = receipt.logs || [];
    const artifacts = receipt.artifacts || [];
    root.innerHTML = `
      <div class="receipt-grid">
        <div class="card">
          <h3>Evidence summary</h3>
          <div class="statline" style="grid-template-columns:repeat(3,1fr)">
            <div class="metric"><b>${steps.length}</b><span>timeline events</span></div>
            <div class="metric"><b>${logs.length}</b><span>log entries</span></div>
            <div class="metric"><b>${artifacts.length}</b><span>artifacts</span></div>
          </div>
          <div class="sep"></div>
          <div class="kv"><span class="tag ok">Redaction checked</span><span class="tag">Local signature stub</span><span class="tag">Replay metadata</span></div>
        </div>
        <div class="card">
          <h3>Timeline</h3>
          <div class="rail">
            ${steps
              .map(
                (step) => `<div class="receipt-step"><b>${escapeHtml(step.event)}</b><small>t+${escapeHtml(step.ts)}s ${step.agent ? `- ${escapeHtml(step.agent)}` : ""}${step.count ? `- ${escapeHtml(step.count)} files` : ""}</small></div>`,
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="sep"></div>
      <div class="code">${escapeHtml(JSON.stringify(receipt, null, 2))}</div>
    `;
  } catch (e) {
    renderError(root, "Receipt failed to load", e);
    console.error(e);
  }
}

window.AgentPages = {
  renderStore,
  renderPacks,
  renderRunReceipt,
  publicBase: AGENTX_PUBLIC_BASE,
  base: AGENTX_BASE || AGENTX_PUBLIC_BASE,
};
