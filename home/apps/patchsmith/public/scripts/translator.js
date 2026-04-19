const playTick = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 520;
    gain.gain.value = 0.02;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // no audio
  }
};

const initTranslator = async () => {
  const dirSelect = document.querySelector("[data-dir]");
  const catSelect = document.querySelector("[data-category]");
  const subSelect = document.querySelector("[data-subcategory]");
  const termSelect = document.querySelector("[data-term]");
  const fireBtn = document.querySelector("[data-fire]");
  const clearBtn = document.querySelector("[data-clear]");
  const termCountEl = document.querySelector("[data-term-count]");
  const jumpInput = document.querySelector("[data-jump]");
  if (!dirSelect || !catSelect || !subSelect || !termSelect) return;

  const { loadFavorites, loadTerms } = await import("./state.js");
  const { filterTerms, getSubcategories, getCategoryCounts, getRushCounts } = await import("./filters.js");
  const { renderBestMatch } = await import("./renderers.js");

  await loadFavorites();
  const terms = await loadTerms();
  const statusEl = document.querySelector("[data-status]");
  const briefEl = document.querySelector("[data-brief]");
  const resultsPanel = document.querySelector(".results-panel");
  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };
  const setBrief = (text) => {
    if (briefEl) briefEl.textContent = text;
  };

  const categoryDefs = getCategoryCounts(terms);
  catSelect.innerHTML = categoryDefs.map((c) => {
    return `<option value="${c.value}">${c.label} (${c.count})</option>`;
  }).join("");

  const activeRush = new Set();
  const activeSignals = new Set();

  const populateSubcategories = () => {
    const subs = getSubcategories(terms, catSelect.value);
    subSelect.innerHTML = `<option value="all">All Subcategories</option>` +
      subs.map((s) => `<option value="${s}">${s}</option>`).join("");
  };

  const populateTerms = () => {
    const list = filterTerms(terms, {
      category: catSelect.value,
      subcategory: subSelect.value,
      rush: Array.from(activeRush),
      signals: Array.from(activeSignals)
    });
    termSelect.innerHTML = `<option value="">Select a term…</option>` +
      list.map((t) => `<option value="${t.slug}">${t.term}</option>`).join("");
    if (termCountEl) termCountEl.textContent = `Available terms: ${list.length}`;
    if (fireBtn) {
      fireBtn.disabled = !termSelect.value;
      fireBtn.classList.toggle("armed", !!termSelect.value);
    }
    if (!list.length) setStatus("No Match Found");
  };

  const fire = () => {
    const slug = termSelect.value;
    if (!slug) {
      renderBestMatch(null, [], terms.slice(0, 8), dirSelect.value);
      setStatus("Ready");
      setBrief("");
      resultsPanel?.classList.remove("armed");
      return;
    }
    const term = terms.find((t) => t.slug === slug);
    renderBestMatch(term, [], [], dirSelect.value);
    setStatus("Result Found");
    setBrief(dirSelect.value === "rest-to-tech" ? "Kitchen → Tech briefing ready." : "Tech → Kitchen briefing ready.");
    resultsPanel?.classList.add("armed");
    playTick();
  };

  catSelect.addEventListener("change", () => {
    populateSubcategories();
    populateTerms();
    setStatus("Walking In…");
  });
  subSelect.addEventListener("change", () => {
    populateTerms();
    setStatus("Walking In…");
  });
  dirSelect.addEventListener("change", () => {
    fire();
  });
  termSelect.addEventListener("change", () => {
    if (fireBtn) fireBtn.disabled = !termSelect.value;
    setStatus("Ready");
    if (termSelect.value) fire();
  });
  jumpInput?.addEventListener("input", () => {
    const q = jumpInput.value.trim().toLowerCase();
    if (!q) return;
    const list = filterTerms(terms, {
      category: catSelect.value,
      subcategory: subSelect.value,
      rush: Array.from(activeRush),
      signals: Array.from(activeSignals)
    });
    const hit = list.find((t) => t.term.toLowerCase().includes(q));
    if (hit) {
      termSelect.value = hit.slug;
      fire();
    }
  });
  fireBtn?.addEventListener("click", fire);
  clearBtn?.addEventListener("click", () => {
    catSelect.value = "all";
    subSelect.value = "all";
    populateSubcategories();
    populateTerms();
    termSelect.value = "";
    renderBestMatch(null, [], terms.slice(0, 8), dirSelect.value);
    setStatus("Ready");
    setBrief("");
    playTick();
  });

  const updateRushCounts = () => {
    const counts = getRushCounts(terms);
    document.querySelectorAll("[data-toggle]").forEach((btn) => {
      const label = btn.getAttribute("data-toggle");
      if (!label) return;
      let countEl = btn.querySelector(".count");
      if (!countEl) {
        countEl = document.createElement("span");
        countEl.className = "count";
        btn.appendChild(countEl);
      }
      countEl.textContent = counts[label] || 0;
    });
  };
  updateRushCounts();

  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const label = btn.getAttribute("data-toggle");
      if (!label) return;
      if (activeRush.has(label)) activeRush.delete(label);
      else activeRush.add(label);
      btn.classList.toggle("active");
      populateSubcategories();
      populateTerms();
      setStatus(activeRush.size ? `Rush: ${label}` : "Ready");
      playTick();
    });
  });

  document.querySelectorAll("[data-signal]").forEach((item) => {
    item.addEventListener("click", () => {
      const label = item.getAttribute("data-signal");
      if (!label) return;
      if (activeSignals.has(label)) activeSignals.delete(label);
      else activeSignals.add(label);
      item.classList.toggle("active");
      populateSubcategories();
      populateTerms();
      setStatus(activeSignals.size ? `Signal: ${label}` : "Ready");
      playTick();
    });
  });

  const resultsContainer = document.querySelector("[data-result]");
  resultsContainer?.addEventListener("click", (e) => {
    const row = e.target.closest("[data-term-link]");
    if (!row) return;
    const slug = row.getAttribute("data-term-link");
    if (!slug) return;
    termSelect.value = slug;
    fire();
  });

  populateSubcategories();
  populateTerms();
  renderBestMatch(null, [], terms.slice(0, 8), dirSelect.value);
  setStatus("Walking In…");
};

export { initTranslator };