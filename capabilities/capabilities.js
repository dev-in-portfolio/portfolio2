(() => {
  const STATUS_LABELS = {
    "verified-current": "Verified current",
    "current-profile": "Current profile",
    "current-catalog-pending": "Cataloged · verification pending",
    "current-repository": "Current repository"
  };

  const state = {
    registry: null,
    query: "",
    status: "all",
    focused: false
  };

  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function evidenceMap() {
    return new Map((state.registry?.evidence || []).map((item) => [item.id, item]));
  }

  function referencedEvidenceIds() {
    const ids = new Set();
    (state.registry?.capabilities || []).forEach((capability) => {
      (capability.evidenceIds || []).forEach((id) => ids.add(id));
    });
    return ids;
  }

  function updateMetrics() {
    const capabilities = state.registry?.capabilities || [];
    const evidenceById = evidenceMap();
    const referenced = [...referencedEvidenceIds()]
      .map((id) => evidenceById.get(id))
      .filter(Boolean);

    $("#metricCapabilities").textContent = capabilities.length;
    $("#metricEvidence").textContent = referenced.length;
    $("#metricVerified").textContent = referenced.filter((item) => item.status === "verified-current").length;
    $("#metricPending").textContent = referenced.filter((item) => item.status === "current-catalog-pending").length;
  }

  function statusBadge(item) {
    const label = STATUS_LABELS[item.status] || item.status;
    return `<span class="status-badge status-${escapeHtml(item.status)}">${escapeHtml(label)}</span>`;
  }

  function evidenceCard(item) {
    const verified = item.verifiedOn
      ? `<span class="verification-date">Reviewed ${escapeHtml(item.verifiedOn)}</span>`
      : "";
    const tags = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");

    return `
      <article class="evidence-card" data-status="${escapeHtml(item.status)}">
        <div class="status-row">${statusBadge(item)}${verified}</div>
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.summary)}</p>
        </div>
        <div class="tag-list">${tags}</div>
        <a class="evidence-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">
          Open evidence
        </a>
      </article>`;
  }

  function capabilityMatches(capability, evidence) {
    const q = state.query.trim().toLowerCase();
    const statusMatches = state.status === "all"
      || evidence.some((item) => item.status === state.status);

    if (!statusMatches) return false;
    if (!q) return true;

    const text = [
      capability.title,
      capability.outcome,
      ...(capability.covers || []),
      ...(capability.roleAlignment || []),
      ...evidence.flatMap((item) => [item.name, item.summary, ...(item.tags || [])])
    ].join(" ").toLowerCase();

    return text.includes(q);
  }

  function capabilityCard(capability, evidence) {
    const roleChips = (capability.roleAlignment || [])
      .map((role) => `<span class="role-chip">${escapeHtml(role)}</span>`)
      .join("");
    const covers = (capability.covers || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
    const cards = evidence.map(evidenceCard).join("");
    const shouldOpen = Boolean(state.query.trim());

    return `
      <details class="capability-card" id="${escapeHtml(capability.id)}" ${shouldOpen ? "open" : ""}>
        <summary class="capability-summary">
          <div class="capability-title-wrap">
            <h3>${escapeHtml(capability.title)}</h3>
            <p class="capability-outcome">${escapeHtml(capability.outcome)}</p>
            <div class="role-chips" aria-label="Example role alignment">${roleChips}</div>
          </div>
        </summary>
        <div class="capability-body">
          <div class="body-grid">
            <section>
              <p class="eyebrow">What this covers</p>
              <ul class="coverage-list">${covers}</ul>
            </section>
            <section>
              <div class="evidence-heading">
                <p class="eyebrow">Specific evidence</p>
                <span>${evidence.length} project${evidence.length === 1 ? "" : "s"}</span>
              </div>
              <div class="evidence-grid">${cards}</div>
            </section>
          </div>
        </div>
      </details>`;
  }

  function render() {
    const evidenceById = evidenceMap();
    const visible = [];

    for (const capability of state.registry?.capabilities || []) {
      const fullEvidence = (capability.evidenceIds || [])
        .map((id) => evidenceById.get(id))
        .filter(Boolean);
      const evidence = fullEvidence
        .filter((item) => state.status === "all" || item.status === state.status);

      if (capabilityMatches(capability, fullEvidence) && evidence.length) {
        visible.push({ capability, evidence });
      }
    }

    $("#capabilityList").innerHTML = visible
      .map(({ capability, evidence }) => capabilityCard(capability, evidence))
      .join("");

    $("#emptyState").hidden = visible.length > 0;
    $("#resultCount").textContent = `${visible.length} of ${state.registry.capabilities.length} capability groups shown`;
    document.body.classList.toggle("focused", state.focused);
  }

  function bindControls() {
    $("#capabilitySearch").addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });
    $("#statusFilter").addEventListener("change", (event) => {
      state.status = event.target.value;
      render();
    });
    $("#focusedView").addEventListener("change", (event) => {
      state.focused = event.target.checked;
      render();
    });
  }

  async function init() {
    try {
      const response = await fetch("./capabilities.registry.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Registry request failed with ${response.status}`);
      state.registry = await response.json();
      updateMetrics();
      bindControls();
      render();
    } catch (error) {
      console.error(error);
      $("#capabilityList").innerHTML = `
        <div class="empty-state">
          The capability evidence registry could not be loaded. Please refresh or open the project catalog.
        </div>`;
      $("#resultCount").textContent = "Registry unavailable";
    }
  }

  init();
})();
