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

function permList(perms) {
  return `<div class="kv">${perms.map((p) => `<span class="tag">${p}</span>`).join("")}</div>`;
}

function normalizeSlug(value) {
  return String(value || "").toLowerCase().trim();
}

function computeRisk(perms) {
  const list = Array.isArray(perms) ? perms : [];
  const hasHigh = list.some((item) =>
    /(approval\.high_risk|crypto\.sign|keys\.use\.private|hardware\.authn|vault\.unlock|secrets\.issue_handle)/.test(item)
  );
  const hasMedium = list.some((item) =>
    /(local\.fs\.write|local\.exec|browser\.automation|browser\.dom\.write|user\.data\.read|net\.egress)/.test(item)
  );
  if (hasHigh) return { label: "High-risk", className: "bad" };
  if (hasMedium) return { label: "Medium-risk", className: "warn" };
  return { label: "Low-risk", className: "ok" };
}

function computeTrustSignals(agent) {
  const risk = computeRisk(agent.permissions || []);
  const signals = [];
  if ((agent.demoStatus || "") === "demo") signals.push("Has demo evidence");
  if ((agent.demoStatus || "") === "local-only") signals.push("Local-only runtime");
  if ((agent.outputs || []).length) signals.push(`${agent.outputs.length} declared outputs`);
  if ((agent.permissions || []).length) signals.push(`${agent.permissions.length} declared permissions`);
  return { risk, signals };
}

function findRelevantTasks(tasks, agent) {
  const agentName = normalizeSlug(agent.name);
  return (tasks || []).filter((task) => normalizeSlug(task.agentName) === agentName);
}

function findRelevantRuns(runs, agent) {
  const agentName = normalizeSlug(agent.name);
  return (runs || []).filter((run) => normalizeSlug(run.agentName) === agentName);
}

function agentCard(a, context = {}) {
  const trust = computeTrustSignals(a);
  const relevantTasks = findRelevantTasks(context.tasks, a);
  const relevantRuns = findRelevantRuns(context.runs, a);
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
      <span class="tag ${trust.risk.className}">${trust.risk.label}</span>
      ${status}
      <span class="tag">ID ${a.id}</span>
    </div>
    <div class="kv">
      ${trust.signals.slice(0, 2).map((item) => `<span class="tag">${item}</span>`).join("")}
    </div>
    ${
      relevantTasks.length || relevantRuns.length
        ? `<div class="kv">
            ${relevantTasks[0] ? `<span class="tag ok">Replay task available</span>` : ""}
            ${relevantRuns[0] ? `<span class="tag ok">Receipt available</span>` : ""}
          </div>`
        : ""
    }
  </a>`;
}

async function renderStore() {
  const grid = qs("#agentGrid");
  const filter = qs("#packFilter");

  if (!grid || !filter) return;

  try {
    const [agents, runs, tasks] = await Promise.all([
      loadJson([withBase("/assets/data/agents.json")]),
      loadRunIndex(),
      loadSampleTasks(),
    ]);

    function apply() {
      const v = filter.value;
      const list = !v ? agents : agents.filter((a) => a.pack === v);

      grid.innerHTML = list.length
        ? list.map((agent) => agentCard(agent, { runs, tasks })).join("")
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
    const packs = await loadJson([withBase("/assets/data/packs.json")]);
    const agents = await loadJson([withBase("/assets/data/agents.json")]);
    const runs = await loadRunIndex();
    const tasks = await loadSampleTasks();

    root.innerHTML = packs
      .map((p) => {
        const list = p.agents
          .map((slug) => agents.find((a) => a.slug === slug))
          .filter(Boolean);
        const perms = Array.from(new Set(list.flatMap((a) => a.permissions))).sort();
        const risk = computeRisk(perms);
        const relevantTasks = (tasks || []).filter((task) =>
          list.some((agent) => normalizeSlug(agent.name) === normalizeSlug(task.agentName))
        );
        const relevantRuns = (runs || []).filter((run) =>
          list.some((agent) => normalizeSlug(agent.name) === normalizeSlug(run.agentName))
        );

        const packZipHref = withBase(`/assets/packs/${p.slug}.agentpack.zip`);
        const packPageHref = withBase(`/packs/${p.slug}.html`);
        const memeHref = withBase(`/assets/packs/no-soup-for-you.png`);

        return `
        <div class="card">
          <h3>${p.name}</h3>
          <p>${list.length} agents • permissions summary below</p>
          <div class="kv">
            <span class="tag ${risk.className}">${risk.label}</span>
            <span class="tag">${list.length} agents</span>
            ${relevantTasks[0] ? `<span class="tag ok">${relevantTasks.length} replay task${relevantTasks.length > 1 ? "s" : ""}</span>` : ""}
            ${relevantRuns[0] ? `<span class="tag ok">${relevantRuns.length} receipt${relevantRuns.length > 1 ? "s" : ""}</span>` : ""}
            ${
              p.slug === "pack-z"
                ? `<a class="btn primary" href="${packZipHref}" download>Download ${p.slug}.agentpack.zip</a>
                   <a class="btn" href="${memeHref}" download>Download image</a>`
                : `<a class="btn primary" href="${packZipHref}" download>Download ${p.slug}.agentpack.zip</a>`
            }
            <a class="btn" href="${packPageHref}">Open pack page</a>
            ${relevantTasks[0] ? `<a class="btn" href="${withBase(`/runner.html?task=${encodeURIComponent(relevantTasks[0].id)}`)}">Replay task</a>` : ""}
            ${relevantRuns[0] ? `<a class="btn" href="${withBase(`/runs/${relevantRuns[0].id}.html`)}">View receipt</a>` : ""}
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

window.AgentPages = {
  renderStore,
  renderPacks,
  publicBase: AGENTX_PUBLIC_BASE,
  base: AGENTX_BASE || AGENTX_PUBLIC_BASE,
};

function formatDateTime(value) {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "Unknown";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
}

function badgeClass(status) {
  if (!status) return "";
  const normalized = String(status).toLowerCase();
  if (["completed", "success", "passed"].includes(normalized)) return "ok";
  if (["blocked", "failed", "error", "denied"].includes(normalized)) return "bad";
  if (["warning", "needs-input", "partial", "running"].includes(normalized)) return "warn";
  return "";
}

function normalizeTimelineStep(step, index) {
  const kind = step.kind || "event";
  const status = step.status || "completed";
  return {
    id: step.id || `step-${index + 1}`,
    kind,
    status,
    title: step.title || step.event || `Step ${index + 1}`,
    detail: step.detail || "",
    tool: step.tool || "",
    startedAt: step.startedAt || step.ts || null,
    finishedAt: step.finishedAt || null,
    durationMs: step.durationMs || null,
    metrics: step.metrics || {},
    receiptRefs: Array.isArray(step.receiptRefs) ? step.receiptRefs : [],
  };
}

function normalizeRunRecord(raw, runId) {
  if (raw && raw.schemaVersion === "agent-run.v1" && raw.run) {
    const run = raw.run;
    return {
      schemaVersion: raw.schemaVersion,
      id: run.id || runId,
      title: run.title || runId,
      status: run.status || "completed",
      outcome: run.outcome || "success",
      agent: run.agent || {},
      task: run.task || {},
      policy: run.policy || {},
      startedAt: run.startedAt || null,
      finishedAt: run.finishedAt || null,
      durationMs: run.durationMs || null,
      totals: run.totals || {
        steps: Array.isArray(run.timeline) ? run.timeline.length : 0,
        toolCalls: 0,
        artifacts: Array.isArray(run.artifacts) ? run.artifacts.length : 0,
        warnings: 0,
        errors: 0,
      },
      timeline: (run.timeline || []).map(normalizeTimelineStep),
      artifacts: Array.isArray(run.artifacts) ? run.artifacts : [],
      logs: Array.isArray(run.logs) ? run.logs : [],
      checks: Array.isArray(run.checks) ? run.checks : [],
      summary: run.summary || {},
    };
  }

  const legacySteps = Array.isArray(raw && raw.steps) ? raw.steps : [];
  const legacyArtifacts = Array.isArray(raw && raw.artifacts) ? raw.artifacts : [];
  const legacyLogs = Array.isArray(raw && raw.logs) ? raw.logs : [];
  return {
    schemaVersion: "legacy-receipts.v0",
    id: runId,
    title: runId,
    status: "completed",
    outcome: "success",
    agent: { slug: (legacySteps[0] && legacySteps[0].agent) || "unknown-agent" },
    task: { summary: "Legacy receipt import" },
    policy: {},
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    totals: {
      steps: legacySteps.length,
      toolCalls: legacySteps.filter((step) => String(step.event || "").includes(".")).length,
      artifacts: legacyArtifacts.length,
      warnings: 0,
      errors: 0,
    },
    timeline: legacySteps.map((step, index) =>
      normalizeTimelineStep(
        {
          id: `legacy-step-${index + 1}`,
          kind: "event",
          status: "completed",
          title: step.event || `Event ${index + 1}`,
          detail: Object.keys(step)
            .filter((key) => !["ts", "event"].includes(key))
            .map((key) => `${key}: ${step[key]}`)
            .join(" • "),
          startedAt: step.ts || null,
        },
        index
      )
    ),
    artifacts: legacyArtifacts,
    logs: legacyLogs,
    checks: [],
    summary: {},
  };
}

async function loadRunIndex() {
  return loadJson([withBase("/assets/sample-runs/index.json")]);
}

async function loadRunRecord(runId) {
  const raw = await loadJson([withBase(`/assets/sample-runs/${runId}.receipts.json`)]);
  return normalizeRunRecord(raw, runId);
}

async function loadSampleTasks() {
  return loadJson([withBase("/assets/sample-runs/tasks.json")]);
}

async function loadPolicyProfiles() {
  return loadJson([withBase("/assets/data/policy-profiles.json")]);
}

async function loadPolicyScenarios() {
  return loadJson([withBase("/assets/data/policy-scenarios.json")]);
}

function runCardHtml(item) {
  const statusClass = badgeClass(item.status);
  return `
    <a class="card run-card" href="${escapeHtml(withBase(`/runs/${item.id}.html`))}" style="text-decoration:none">
      <div class="run-card-top">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.agentName)} • ${escapeHtml(item.pack)} • ${escapeHtml(item.targetLabel)}</p>
        </div>
        <span class="tag ${statusClass}">${escapeHtml(item.status)}</span>
      </div>
      <p class="run-card-summary">${escapeHtml(item.taskSummary)}</p>
      <div class="kv">
        <span class="tag">Started ${escapeHtml(formatDateTime(item.startedAt))}</span>
        <span class="tag">${escapeHtml(formatDuration(item.durationMs))}</span>
        <span class="tag">${escapeHtml(String(item.toolCalls || 0))} tool calls</span>
        <span class="tag">${escapeHtml(String(item.artifactCount || 0))} artifacts</span>
      </div>
    </a>
  `;
}

async function renderRunsIndex() {
  const root = qs("#runsRoot");
  if (!root) return;

  try {
    const runs = await loadRunIndex();
    root.innerHTML = runs.length
      ? runs.map(runCardHtml).join("")
      : `<div class="card"><p style="margin:0;color:var(--muted)">No sample runs registered yet.</p></div>`;
  } catch (e) {
    renderError(root, "Run index failed to load", e);
    console.error(e);
  }
}

function timelineStepHtml(step, index) {
  const statusClass = badgeClass(step.status);
  const metricPairs = Object.entries(step.metrics || {});
  return `
    <div class="timeline-step">
      <div class="timeline-rail">
        <span class="timeline-dot ${statusClass}"></span>
        ${index === 0 ? "" : '<span class="timeline-line"></span>'}
      </div>
      <div class="timeline-card">
        <div class="timeline-head">
          <div>
            <div class="timeline-kicker">${escapeHtml(step.kind)}</div>
            <h3>${escapeHtml(step.title)}</h3>
          </div>
          <div class="kv">
            <span class="tag ${statusClass}">${escapeHtml(step.status)}</span>
            ${step.durationMs ? `<span class="tag">${escapeHtml(formatDuration(step.durationMs))}</span>` : ""}
            ${step.tool ? `<span class="tag">${escapeHtml(step.tool)}</span>` : ""}
          </div>
        </div>
        ${step.detail ? `<p>${escapeHtml(step.detail)}</p>` : ""}
        ${
          metricPairs.length
            ? `<div class="kv">${metricPairs
                .map(([key, value]) => `<span class="tag">${escapeHtml(`${key}: ${value}`)}</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
    </div>
  `;
}

function artifactHtml(artifact) {
  return `
    <div class="card artifact-card">
      <h3>${escapeHtml(artifact.label || artifact.path || artifact.type || "Artifact")}</h3>
      <p>${escapeHtml(artifact.summary || artifact.path || "Recorded artifact")}</p>
      <div class="kv">
        ${artifact.type ? `<span class="tag">${escapeHtml(artifact.type)}</span>` : ""}
        ${artifact.path ? `<span class="tag">${escapeHtml(artifact.path)}</span>` : ""}
        ${artifact.status ? `<span class="tag ${badgeClass(artifact.status)}">${escapeHtml(artifact.status)}</span>` : ""}
      </div>
    </div>
  `;
}

function logHtml(entry) {
  return `
    <div class="log-entry">
      <span class="tag ${badgeClass(entry.level)}">${escapeHtml(entry.level || "info")}</span>
      <span class="log-message">${escapeHtml(entry.msg || entry.message || "Log entry")}</span>
      ${
        entry.meta && Object.keys(entry.meta).length
          ? `<div class="log-meta">${escapeHtml(JSON.stringify(entry.meta))}</div>`
          : ""
      }
    </div>
  `;
}

function compareMetricRow(label, left, right) {
  return `
    <div class="compare-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(left)}</strong>
      <strong>${escapeHtml(right)}</strong>
    </div>
  `;
}

function comparePolicyRow(label, leftValue, rightValue) {
  const same = String(leftValue) === String(rightValue);
  return `
    <div class="compare-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(leftValue)}</strong>
      <strong class="${same ? "" : "policy-diff-value"}">${escapeHtml(rightValue)}</strong>
    </div>
  `;
}

async function renderRunInspector() {
  const root = qs("#runInspector");
  if (!root) return;

  const runId = root.getAttribute("data-run-id");
  if (!runId) {
    renderError(root, "Run inspector setup failed", new Error("Missing data-run-id attribute"));
    return;
  }

  try {
    const run = await loadRunRecord(runId);
    const pageTitle = qs("[data-run-title]");
    if (pageTitle) pageTitle.textContent = `Run: ${run.title}`;

    root.innerHTML = `
      <section class="inspector-grid">
        <div class="hcard">
          <div class="inspector-head">
            <div>
              <div class="timeline-kicker">Canonical run schema</div>
              <h2>${escapeHtml(run.title)}</h2>
            </div>
            <div class="kv">
              <span class="tag ${badgeClass(run.status)}">${escapeHtml(run.status)}</span>
              <span class="tag">${escapeHtml(run.schemaVersion)}</span>
            </div>
          </div>
          <p>${escapeHtml(run.task.summary || "No task summary provided.")}</p>
          <div class="ctas">
            ${
              run.task && run.task.templateId
                ? `<a class="btn primary" href="${escapeHtml(withBase(`/runner.html?task=${encodeURIComponent(run.task.templateId)}`))}">Replay sample task</a>`
                : ""
            }
            <a class="btn" href="${escapeHtml(withBase(`/runs/compare.html?left=${encodeURIComponent(run.id)}`))}">Compare runs</a>
          </div>
          <div class="stat-grid">
            <div class="stat-card"><span>Agent</span><strong>${escapeHtml(run.agent.name || run.agent.slug || "Unknown")}</strong></div>
            <div class="stat-card"><span>Pack</span><strong>${escapeHtml(run.agent.pack || "Unknown")}</strong></div>
            <div class="stat-card"><span>Started</span><strong>${escapeHtml(formatDateTime(run.startedAt))}</strong></div>
            <div class="stat-card"><span>Duration</span><strong>${escapeHtml(formatDuration(run.durationMs))}</strong></div>
            <div class="stat-card"><span>Tool calls</span><strong>${escapeHtml(String(run.totals.toolCalls || 0))}</strong></div>
            <div class="stat-card"><span>Artifacts</span><strong>${escapeHtml(String(run.totals.artifacts || 0))}</strong></div>
          </div>
        </div>
        <div class="hcard">
          <h2>Policy envelope</h2>
          <div class="policy-grid">
            <div class="card"><h3>Mode</h3><p>${escapeHtml(run.policy.mode || "Unknown")}</p></div>
            <div class="card"><h3>Approval</h3><p>${escapeHtml(run.policy.approval || "Unknown")}</p></div>
            <div class="card"><h3>Network</h3><p>${escapeHtml(run.policy.network || "Unknown")}</p></div>
            <div class="card"><h3>Workspace</h3><p>${escapeHtml(run.policy.workspace || "Unknown")}</p></div>
          </div>
        </div>
      </section>
      <section class="inspector-grid">
        <div class="hcard">
          <h2>Step timeline</h2>
          <div class="timeline-list">
            ${run.timeline.map(timelineStepHtml).join("")}
          </div>
        </div>
        <div class="inspector-stack">
          <div class="hcard">
            <h2>Artifacts</h2>
            <div class="artifact-list">
              ${
                run.artifacts.length
                  ? run.artifacts.map(artifactHtml).join("")
                  : `<div class="card"><p style="margin:0;color:var(--muted)">No artifacts were recorded.</p></div>`
              }
            </div>
          </div>
          <div class="hcard">
            <h2>Logs</h2>
            <div class="log-list">
              ${
                run.logs.length
                  ? run.logs.map(logHtml).join("")
                  : `<div class="card"><p style="margin:0;color:var(--muted)">No logs were recorded.</p></div>`
              }
            </div>
          </div>
        </div>
      </section>
    `;
  } catch (e) {
    renderError(root, "Run inspector failed to load", e);
    console.error(e);
  }
}

async function renderRunCompare() {
  const root = qs("#runCompare");
  if (!root) return;

  try {
    const [runs, taskCatalog] = await Promise.all([loadRunIndex(), loadSampleTasks()]);
    const params = new URLSearchParams(window.location.search);
    const leftId = params.get("left") || (runs[0] && runs[0].id);
    const rightId = params.get("right") || (runs[1] && runs[1].id) || leftId;
    const [leftRun, rightRun] = await Promise.all([loadRunRecord(leftId), loadRunRecord(rightId)]);

    const options = runs
      .map(
        (item) =>
          `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} • ${escapeHtml(item.status)}</option>`
      )
      .join("");

    const leftTask = taskCatalog.find((task) => task.id === leftRun.task.templateId);
    const rightTask = taskCatalog.find((task) => task.id === rightRun.task.templateId);

    root.innerHTML = `
      <div class="hcard">
        <div class="inspector-head">
          <div>
            <div class="timeline-kicker">Run comparison</div>
            <h2>Compare two receipts on the same lab surface</h2>
          </div>
          <a class="btn" href="${escapeHtml(withBase("/runs/index.html"))}">Back to runs</a>
        </div>
        <div class="compare-picker">
          <label>
            <span class="timeline-kicker">Left run</span>
            <select id="compareLeft">${options}</select>
          </label>
          <label>
            <span class="timeline-kicker">Right run</span>
            <select id="compareRight">${options}</select>
          </label>
          <button class="btn primary" id="compareApply" type="button">Apply comparison</button>
        </div>
      </div>
      <section class="compare-grid">
        <div class="hcard">
          <div class="timeline-kicker">Left</div>
          <h2>${escapeHtml(leftRun.title)}</h2>
          <p>${escapeHtml(leftRun.task.summary || "")}</p>
          <div class="kv">
            <span class="tag ${badgeClass(leftRun.status)}">${escapeHtml(leftRun.status)}</span>
            <span class="tag">${escapeHtml(leftRun.agent.name || leftRun.agent.slug || "Unknown")}</span>
            <span class="tag">${escapeHtml(formatDuration(leftRun.durationMs))}</span>
          </div>
          ${
            leftTask
              ? `<div class="sep"></div><a class="btn" href="${escapeHtml(
                  withBase(`/runner.html?task=${encodeURIComponent(leftTask.id)}`)
                )}">Replay left task</a>`
              : ""
          }
        </div>
        <div class="hcard">
          <div class="timeline-kicker">Right</div>
          <h2>${escapeHtml(rightRun.title)}</h2>
          <p>${escapeHtml(rightRun.task.summary || "")}</p>
          <div class="kv">
            <span class="tag ${badgeClass(rightRun.status)}">${escapeHtml(rightRun.status)}</span>
            <span class="tag">${escapeHtml(rightRun.agent.name || rightRun.agent.slug || "Unknown")}</span>
            <span class="tag">${escapeHtml(formatDuration(rightRun.durationMs))}</span>
          </div>
          ${
            rightTask
              ? `<div class="sep"></div><a class="btn" href="${escapeHtml(
                  withBase(`/runner.html?task=${encodeURIComponent(rightTask.id)}`)
                )}">Replay right task</a>`
              : ""
          }
        </div>
      </section>
      <div class="hcard" style="margin-top:18px">
        <h2>Decision-facing diffs</h2>
        <div class="compare-table">
          ${compareMetricRow("Status", leftRun.status, rightRun.status)}
          ${compareMetricRow("Outcome", leftRun.outcome || "n/a", rightRun.outcome || "n/a")}
          ${compareMetricRow("Policy mode", leftRun.policy.mode || "Unknown", rightRun.policy.mode || "Unknown")}
          ${compareMetricRow("Approval gate", leftRun.policy.approval || "Unknown", rightRun.policy.approval || "Unknown")}
          ${compareMetricRow("Tool calls", String(leftRun.totals.toolCalls || 0), String(rightRun.totals.toolCalls || 0))}
          ${compareMetricRow("Artifacts", String(leftRun.totals.artifacts || 0), String(rightRun.totals.artifacts || 0))}
          ${compareMetricRow("Warnings", String(leftRun.totals.warnings || 0), String(rightRun.totals.warnings || 0))}
          ${compareMetricRow("Errors", String(leftRun.totals.errors || 0), String(rightRun.totals.errors || 0))}
        </div>
      </div>
    `;

    const leftSelect = qs("#compareLeft", root);
    const rightSelect = qs("#compareRight", root);
    const applyButton = qs("#compareApply", root);
    if (leftSelect) leftSelect.value = leftId;
    if (rightSelect) rightSelect.value = rightId;
    if (applyButton && leftSelect && rightSelect) {
      applyButton.addEventListener("click", () => {
        const next = new URLSearchParams();
        next.set("left", leftSelect.value);
        next.set("right", rightSelect.value);
        window.location.search = next.toString();
      });
    }
  } catch (e) {
    renderError(root, "Run comparison failed to load", e);
    console.error(e);
  }
}

async function renderRunnerCatalog() {
  const root = qs("#runnerTaskCatalog");
  if (!root) return;

  try {
    const tasks = await loadSampleTasks();
    const params = new URLSearchParams(window.location.search);
    const activeId = params.get("task");
    const active = tasks.find((task) => task.id === activeId) || tasks[0];

    root.innerHTML = `
      <div class="inspector-grid">
        <div class="hcard">
          <div class="timeline-kicker">Deterministic sample tasks</div>
          <h2>Replayable task briefs</h2>
          <p>These tasks are fixed scenarios for validating policies, receipts, and tool behavior without theatrical randomness.</p>
          <div class="artifact-list">
            ${tasks
              .map(
                (task) => `
                  <a class="card" href="${escapeHtml(withBase(`/runner.html?task=${encodeURIComponent(task.id)}`))}" style="text-decoration:none">
                    <h3>${escapeHtml(task.title)}</h3>
                    <p>${escapeHtml(task.summary)}</p>
                    <div class="kv">
                      <span class="tag">${escapeHtml(task.agentName)}</span>
                      <span class="tag">${escapeHtml(task.pack)}</span>
                      <span class="tag">${escapeHtml(task.expectedOutcome)}</span>
                    </div>
                  </a>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="hcard">
          <div class="timeline-kicker">Selected task</div>
          <h2>${escapeHtml(active.title)}</h2>
          <p>${escapeHtml(active.summary)}</p>
          <div class="stat-grid">
            <div class="stat-card"><span>Agent</span><strong>${escapeHtml(active.agentName)}</strong></div>
            <div class="stat-card"><span>Pack</span><strong>${escapeHtml(active.pack)}</strong></div>
            <div class="stat-card"><span>Target</span><strong>${escapeHtml(active.target)}</strong></div>
            <div class="stat-card"><span>Expected outcome</span><strong>${escapeHtml(active.expectedOutcome)}</strong></div>
          </div>
          <div class="sep"></div>
          <div class="code">${escapeHtml(active.runnerCommand)}</div>
          <div class="sep"></div>
          <div class="kv">
            ${(active.policyHints || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    renderError(root, "Runner task catalog failed to load", e);
    console.error(e);
  }
}

async function renderPolicySandbox() {
  const root = qs("#policySandbox");
  if (!root) return;

  try {
    const [profiles, scenarios, tasks] = await Promise.all([
      loadPolicyProfiles(),
      loadPolicyScenarios(),
      loadSampleTasks(),
    ]);
    const params = new URLSearchParams(window.location.search);
    const baselineId = params.get("baseline") || (profiles[0] && profiles[0].id);
    const candidateId = params.get("candidate") || (profiles[1] && profiles[1].id) || baselineId;
    const scenarioId = params.get("scenario") || (scenarios[0] && scenarios[0].id);

    const baseline = profiles.find((item) => item.id === baselineId) || profiles[0];
    const candidate = profiles.find((item) => item.id === candidateId) || profiles[0];
    const scenario = scenarios.find((item) => item.id === scenarioId) || scenarios[0];
    const task = tasks.find((item) => item.id === scenario.taskId);

    const options = profiles
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
      .join("");
    const scenarioOptions = scenarios
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
      .join("");

    const keys = Array.from(
      new Set([...Object.keys(baseline.rules || {}), ...Object.keys(candidate.rules || {})])
    );

    root.innerHTML = `
      <div class="hcard">
        <div class="inspector-head">
          <div>
            <div class="timeline-kicker">Policy sandbox</div>
            <h2>Diff policy envelopes before the run happens</h2>
          </div>
          <a class="btn" href="${escapeHtml(withBase("/runs/index.html"))}">Inspect runs</a>
        </div>
        <div class="compare-picker">
          <label>
            <span class="timeline-kicker">Baseline policy</span>
            <select id="policyBaseline">${options}</select>
          </label>
          <label>
            <span class="timeline-kicker">Candidate policy</span>
            <select id="policyCandidate">${options}</select>
          </label>
          <label>
            <span class="timeline-kicker">Scenario</span>
            <select id="policyScenario">${scenarioOptions}</select>
          </label>
        </div>
        <div class="ctas" style="margin-top:12px">
          <button class="btn primary" id="policyApply" type="button">Apply sandbox</button>
          ${
            task
              ? `<a class="btn" href="${escapeHtml(
                  withBase(`/runner.html?task=${encodeURIComponent(task.id)}`)
                )}">Replay scenario task</a>`
              : ""
          }
        </div>
      </div>

      <section class="compare-grid">
        <div class="hcard">
          <div class="timeline-kicker">Baseline</div>
          <h2>${escapeHtml(baseline.name)}</h2>
          <p>${escapeHtml(baseline.summary)}</p>
          <div class="kv">${(baseline.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
        <div class="hcard">
          <div class="timeline-kicker">Candidate</div>
          <h2>${escapeHtml(candidate.name)}</h2>
          <p>${escapeHtml(candidate.summary)}</p>
          <div class="kv">${(candidate.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
      </section>

      <div class="hcard" style="margin-top:18px">
        <h2>Rule diffs</h2>
        <div class="compare-table">
          ${keys
            .map((key) =>
              comparePolicyRow(
                key,
                baseline.rules && key in baseline.rules ? String(baseline.rules[key]) : "not-set",
                candidate.rules && key in candidate.rules ? String(candidate.rules[key]) : "not-set"
              )
            )
            .join("")}
        </div>
      </div>

      <section class="inspector-grid">
        <div class="hcard">
          <div class="timeline-kicker">Scenario</div>
          <h2>${escapeHtml(scenario.name)}</h2>
          <p>${escapeHtml(scenario.summary)}</p>
          <div class="kv">
            <span class="tag">${escapeHtml(scenario.expectedAgent)}</span>
            <span class="tag">${escapeHtml(scenario.target)}</span>
            <span class="tag">${escapeHtml(scenario.riskTier)}</span>
          </div>
          ${
            task
              ? `<div class="sep"></div><div class="code">${escapeHtml(task.runnerCommand)}</div>`
              : ""
          }
        </div>
        <div class="hcard">
          <div class="timeline-kicker">Enforcement result</div>
          <h2>${escapeHtml(scenario.result.headline)}</h2>
          <p>${escapeHtml(scenario.result.summary)}</p>
          <div class="artifact-list">
            ${(scenario.result.checks || [])
              .map(
                (check) => `
                  <div class="card">
                    <h3>${escapeHtml(check.label)}</h3>
                    <p>${escapeHtml(check.detail)}</p>
                    <div class="kv">
                      <span class="tag ${badgeClass(check.status)}">${escapeHtml(check.status)}</span>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </section>
    `;

    const baselineSelect = qs("#policyBaseline", root);
    const candidateSelect = qs("#policyCandidate", root);
    const scenarioSelect = qs("#policyScenario", root);
    if (baselineSelect) baselineSelect.value = baseline.id;
    if (candidateSelect) candidateSelect.value = candidate.id;
    if (scenarioSelect) scenarioSelect.value = scenario.id;
    const apply = qs("#policyApply", root);
    if (apply && baselineSelect && candidateSelect && scenarioSelect) {
      apply.addEventListener("click", () => {
        const next = new URLSearchParams();
        next.set("baseline", baselineSelect.value);
        next.set("candidate", candidateSelect.value);
        next.set("scenario", scenarioSelect.value);
        window.location.search = next.toString();
      });
    }
  } catch (e) {
    renderError(root, "Policy sandbox failed to load", e);
    console.error(e);
  }
}

function injectAgentDetailEnhancements(agent, runs, tasks) {
  const container = qs(".container .hcard");
  if (!container) return;
  if (qs("[data-enhanced-agent-manifest]", container)) return;

  const trust = computeTrustSignals(agent);
  const relevantTasks = findRelevantTasks(tasks, agent);
  const relevantRuns = findRelevantRuns(runs, agent);
  const manifest = document.createElement("div");
  manifest.setAttribute("data-enhanced-agent-manifest", "true");
  manifest.innerHTML = `
    <div class="sep"></div>
    <h3 style="margin:0 0 8px">Capability manifest</h3>
    <div class="artifact-list">
      <div class="card">
        <h3>Trust signals</h3>
        <p>${escapeHtml(agent.purpose)}</p>
        <div class="kv">
          <span class="tag ${trust.risk.className}">${trust.risk.label}</span>
          ${trust.signals.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>Declared outputs</h3>
        <p>What this agent says it will leave behind after a run.</p>
        <div class="kv">
          ${(agent.outputs || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>Connected evidence</h3>
        <p>Relevant lab surfaces for replay and receipts.</p>
        <div class="kv">
          ${relevantTasks[0] ? `<a class="btn" href="${withBase(`/runner.html?task=${encodeURIComponent(relevantTasks[0].id)}`)}">Replay task</a>` : ""}
          ${relevantRuns[0] ? `<a class="btn" href="${withBase(`/runs/${relevantRuns[0].id}.html`)}">View receipt</a>` : ""}
          <a class="btn" href="${withBase("/policy.html")}">Open policy sandbox</a>
        </div>
      </div>
    </div>
  `;
  container.appendChild(manifest);
}

function injectPackDetailEnhancements(pack, agents, runs, tasks) {
  const container = qs(".container .hcard");
  if (!container) return;
  if (qs("[data-enhanced-pack-manifest]", container)) return;

  const list = (pack.agents || []).map((slug) => agents.find((agent) => agent.slug === slug)).filter(Boolean);
  const perms = Array.from(new Set(list.flatMap((agent) => agent.permissions || []))).sort();
  const risk = computeRisk(perms);
  const relevantTasks = (tasks || []).filter((task) =>
    list.some((agent) => normalizeSlug(agent.name) === normalizeSlug(task.agentName))
  );
  const relevantRuns = (runs || []).filter((run) =>
    list.some((agent) => normalizeSlug(agent.name) === normalizeSlug(run.agentName))
  );

  const manifest = document.createElement("div");
  manifest.setAttribute("data-enhanced-pack-manifest", "true");
  manifest.innerHTML = `
    <div class="sep"></div>
    <h3 style="margin:0 0 10px">Pack trust view</h3>
    <div class="artifact-list">
      <div class="card">
        <h3>Registry summary</h3>
        <p>${escapeHtml(pack.name)} exposes a unified permission envelope across ${list.length} agents.</p>
        <div class="kv">
          <span class="tag ${risk.className}">${risk.label}</span>
          <span class="tag">${list.length} agents</span>
          <span class="tag">${perms.length} unique capabilities</span>
        </div>
      </div>
      <div class="card">
        <h3>Linked lab surfaces</h3>
        <p>Sample tasks and receipts tied to this pack.</p>
        <div class="kv">
          ${relevantTasks[0] ? `<a class="btn" href="${withBase(`/runner.html?task=${encodeURIComponent(relevantTasks[0].id)}`)}">Replay sample task</a>` : ""}
          ${relevantRuns[0] ? `<a class="btn" href="${withBase(`/runs/${relevantRuns[0].id}.html`)}">View related receipt</a>` : ""}
          <a class="btn" href="${withBase("/policy.html")}">Inspect policy diff</a>
        </div>
      </div>
    </div>
  `;
  container.appendChild(manifest);
}

async function enhanceDetailPages() {
  const path = window.location.pathname;
  if (!/\/apps\/agents\/(store|packs)\//.test(path) || /\/index\.html$/.test(path)) return;

  try {
    const [agents, packs, runs, tasks] = await Promise.all([
      loadJson([withBase("/assets/data/agents.json")]),
      loadJson([withBase("/assets/data/packs.json")]),
      loadRunIndex(),
      loadSampleTasks(),
    ]);

    const slug = path.split("/").pop().replace(/\.html$/, "");
    if (path.includes("/store/")) {
      const agent = agents.find((item) => item.slug === slug);
      if (agent) injectAgentDetailEnhancements(agent, runs, tasks);
    } else if (path.includes("/packs/")) {
      const pack = packs.find((item) => item.slug === slug);
      if (pack) injectPackDetailEnhancements(pack, agents, runs, tasks);
    }
  } catch (e) {
    console.error("Detail enhancement failed", e);
  }
}

window.AgentPages.renderRunsIndex = renderRunsIndex;
window.AgentPages.renderRunInspector = renderRunInspector;
window.AgentPages.renderRunCompare = renderRunCompare;
window.AgentPages.renderRunnerCatalog = renderRunnerCatalog;
window.AgentPages.renderPolicySandbox = renderPolicySandbox;
window.AgentPages.enhanceDetailPages = enhanceDetailPages;

enhanceDetailPages();
