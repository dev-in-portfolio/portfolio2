function uniqSorted(values) {
  const set = new Set();
  for (const v of values) {
    if (!v) continue;
    set.add(String(v));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function normalizeStr(s) {
  return String(s || "").toLowerCase();
}

function parseVerifiedAgeDays(lastVerified) {
  if (!lastVerified) return null;
  const d = new Date(String(lastVerified));
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function loadIndex() {
  try {
    const res = await fetch("/search-index.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function renderResults(container, results, activeIdx) {
  container.innerHTML = results
    .map((item, idx) => {
      const sev = normalizeStr(item.severity || "unknown");
      const age = parseVerifiedAgeDays(item.last_verified);
      const stale = typeof age === "number" && age >= 90;
      const active = idx === activeIdx ? " is-active" : "";
      const tags =
        []
          .concat(item.systems || [])
          .concat(item.symptoms || [])
          .concat(item.fixes || [])
          .slice(0, 10)
          .map((t) => `<span>${t}</span>`)
          .join("") || "";
      return `
      <article class="card${active}" data-idx="${idx}">
        <div class="card-top">
          <span class="badge sev-${sev}">${sev}</span>
          ${stale ? `<span class="badge warn">stale</span>` : ""}
        </div>
        <h3><a href="${item.url}">${item.title}</a></h3>
        <p>${item.summary || ""}</p>
        <div class="tags">${tags}</div>
      </article>
    `;
    })
    .join("");
}

function fillSelect(select, values) {
  if (!select) return;
  const existing = new Set(Array.from(select.options).map((o) => o.value));
  for (const v of values) {
    if (existing.has(v)) continue;
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  }
}

function attachSearch() {
  const input = document.getElementById("search-input");
  const resultsEl = document.getElementById("search-results");
  if (!input || !resultsEl) return;

  const severitySel = document.getElementById("filter-severity");
  const systemSel = document.getElementById("filter-system");
  const symptomSel = document.getElementById("filter-symptom");
  const fixSel = document.getElementById("filter-fix");
  const staleOnly = document.getElementById("filter-stale");
  const incidentToggle = document.getElementById("incident-toggle");

  let index = [];
  let activeIdx = -1;

  function apply() {
    const q = normalizeStr(input.value).trim();
    const sev = (severitySel && severitySel.value) || "";
    const sys = (systemSel && systemSel.value) || "";
    const sym = (symptomSel && symptomSel.value) || "";
    const fix = (fixSel && fixSel.value) || "";
    const mustBeStale = !!(staleOnly && staleOnly.checked);

    const filtered = index.filter((item) => {
      const inTitle = normalizeStr(item.title).includes(q);
      const inSummary = normalizeStr(item.summary).includes(q);
      const sysText = normalizeStr((item.systems || []).join(" "));
      const symText = normalizeStr((item.symptoms || []).join(" "));
      const fixText = normalizeStr((item.fixes || []).join(" "));
      const inTax = sysText.includes(q) || symText.includes(q) || fixText.includes(q);
      if (q && !(inTitle || inSummary || inTax)) return false;

      if (sev && normalizeStr(item.severity) !== normalizeStr(sev)) return false;
      if (sys && !(item.systems || []).includes(sys)) return false;
      if (sym && !(item.symptoms || []).includes(sym)) return false;
      if (fix && !(item.fixes || []).includes(fix)) return false;

      if (mustBeStale) {
        const age = parseVerifiedAgeDays(item.last_verified);
        if (!(typeof age === "number" && age >= 90)) return false;
      }

      return true;
    });

    const initial = q || sev || sys || sym || fix || mustBeStale ? filtered : index.slice(0, 8);
    activeIdx = initial.length ? Math.min(activeIdx, initial.length - 1) : -1;
    renderResults(resultsEl, initial, activeIdx);
  }

  function setIncidentMode(on) {
    document.documentElement.dataset.incident = on ? "1" : "0";
    if (incidentToggle) incidentToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }

  loadIndex().then((data) => {
    index = data;

    fillSelect(severitySel, uniqSorted(index.map((i) => i.severity).filter(Boolean)));
    fillSelect(systemSel, uniqSorted(index.flatMap((i) => i.systems || [])));
    fillSelect(symptomSel, uniqSorted(index.flatMap((i) => i.symptoms || [])));
    fillSelect(fixSel, uniqSorted(index.flatMap((i) => i.fixes || [])));

    apply();

    input.addEventListener("input", () => {
      activeIdx = -1;
      apply();
    });
    for (const el of [severitySel, systemSel, symptomSel, fixSel, staleOnly]) {
      if (!el) continue;
      el.addEventListener("change", () => {
        activeIdx = -1;
        apply();
      });
    }

    if (incidentToggle) {
      incidentToggle.addEventListener("click", () => {
        const on = document.documentElement.dataset.incident !== "1";
        setIncidentMode(on);
      });
    }

    document.addEventListener("keydown", (e) => {
      // Focus search with "/"
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
        return;
      }

      // Escape clears the query if input focused
      if (e.key === "Escape" && document.activeElement === input) {
        input.value = "";
        activeIdx = -1;
        apply();
        return;
      }

      // Result navigation only when the search input has focus
      if (document.activeElement !== input) return;

      const cards = Array.from(resultsEl.querySelectorAll(".card"));
      if (!cards.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdx = Math.min(cards.length - 1, activeIdx + 1);
        apply();
        const card = resultsEl.querySelector(`.card[data-idx="${activeIdx}"]`);
        if (card) card.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(0, activeIdx === -1 ? 0 : activeIdx - 1);
        apply();
        const card = resultsEl.querySelector(`.card[data-idx="${activeIdx}"]`);
        if (card) card.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        const card = resultsEl.querySelector(`.card[data-idx="${activeIdx}"]`);
        const link = card ? card.querySelector("a") : null;
        if (link && link.href) {
          window.location.href = link.href;
        }
      }
    });

    // Default incident mode off
    setIncidentMode(false);
  });
}

document.addEventListener("DOMContentLoaded", attachSearch);

