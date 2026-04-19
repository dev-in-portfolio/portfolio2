const initTermFilters = () => {
  const list = document.querySelector("[data-term-list]");
  if (!list) return;
  const qInput = document.querySelector("[data-term-search]");
  const catSelect = document.querySelector("[data-term-category]");
  const tagSelect = document.querySelector("[data-term-tag]");
  const countEl = document.querySelector("[data-term-count]");
  const emptyEl = document.querySelector("[data-term-empty]");
  const clearBtn = document.querySelector("[data-term-clear]");
  const rows = Array.from(list.querySelectorAll("[data-term-card]"));

  const apply = () => {
    const q = (qInput?.value || "").toLowerCase();
    const cat = catSelect?.value || "all";
    const tag = tagSelect?.value || "all";
    let count = 0;
    rows.forEach((row) => {
      const matchQ = !q || row.dataset.search?.includes(q);
      const matchC = cat === "all" || row.dataset.category === cat;
      const matchT = tag === "all" || row.dataset.tags?.split(",").includes(tag);
      const show = matchQ && matchC && matchT;
      row.style.display = show ? "grid" : "none";
      if (show) count += 1;
    });
    if (countEl) countEl.textContent = `${count} results`;
    if (emptyEl) emptyEl.hidden = count !== 0;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat !== "all") p.set("category", cat);
    if (tag !== "all") p.set("tag", tag);
    history.replaceState({}, "", `${location.pathname}?${p.toString()}`);
  };

  clearBtn?.addEventListener("click", () => {
    if (qInput) qInput.value = "";
    if (catSelect) catSelect.value = "all";
    if (tagSelect) tagSelect.value = "all";
    apply();
  });

  qInput?.addEventListener("input", apply);
  catSelect?.addEventListener("change", apply);
  tagSelect?.addEventListener("change", apply);

  const params = new URLSearchParams(location.search);
  const q = params.get("q") || "";
  const cat = params.get("category") || "all";
  const tag = params.get("tag") || "all";
  if (qInput) qInput.value = q;
  if (catSelect) catSelect.value = cat;
  if (tagSelect) tagSelect.value = tag;
  apply();
};

export { initTermFilters };