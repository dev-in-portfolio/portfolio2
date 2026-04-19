const scoreTerm = (term, q, dir) => {
  if (!q) return 0;
  const query = q.toLowerCase();
  const termText = term.term.toLowerCase();
  const techText = term.techEquivalent.join(" ").toLowerCase();
  const tags = term.tags.join(" ").toLowerCase();
  const related = term.related.join(" ").toLowerCase();
  const target = dir === "rest-to-tech" ? termText : techText;

  let score = 0;
  if (target === query) score += 100;
  if (target.startsWith(query)) score += 60;
  if (target.includes(query)) score += 40;
  if (termText.includes(query) || techText.includes(query)) score += 20;
  if (tags.includes(query)) score += 10;
  if (related.includes(query)) score += 5;
  return score;
};

const matchesKeywords = (term, words) => {
  if (!words?.length) return true;
  const hay = `${term.term} ${term.definitionRestaurant} ${term.definitionTech} ${term.techEquivalent.join(" ")} ${(term.tags || []).join(" ")}`.toLowerCase();
  return words.some((w) => hay.includes(w));
};

const filterTerms = (terms, { category, subcategory, rush, signals }) => {
  const rushMatchers = {
    "Hot": ["hot", "rush", "urgent", "priority", "fire"],
    "On The Fly": ["on the fly", "urgent", "priority", "rush"],
    "All Day": ["all day", "backlog", "queue", "aggregate", "count"],
    "86 Mode": ["86", "out", "deprec", "unavailable", "void"]
  };
  
  const signalMatchers = {
    "Incident": ["incident", "alert", "issue"],
    "Outage": ["outage", "down", "offline"],
    "Escalation": ["escalation", "page", "on-call"],
    "Critical": ["critical", "sev", "emergency"],
    "Latency": ["latency", "drag", "slow", "backlog"],
    "Degraded": ["degraded", "partial", "reduced"],
    "Quality": ["quality", "refire", "void", "complaint"],
    "Capacity": ["capacity", "overload", "weeds", "rush"],
    "Safety": ["safety", "allergy", "hazard"],
    "Stockout": ["stockout", "out of stock", "86", "depletion"]
  };

  const categoryDefs = [
    { value: "all", label: "All", match: () => true },
    { value: "restaurant", label: "Restaurant", match: () => true },
    { value: "BOH", label: "Back of House", match: (t) => t.category === "BOH" },
    { value: "FOH", label: "Front of House", match: (t) => t.category === "FOH" },
    { value: "MANAGEMENT", label: "Management", match: (t) => t.category === "MANAGEMENT" },
    { value: "INVENTORY", label: "Inventory", match: (t) => t.category === "INVENTORY" },
    { value: "SERVICE", label: "Service", match: (t) => t.category === "SERVICE" },
    { value: "GENERAL", label: "General", match: (t) => t.category === "GENERAL" }
  ];

  const def = categoryDefs.find((d) => d.value === category) || categoryDefs[0];
  
  return terms.filter((t) => {
    if (!def.match(t)) return false;
    if (subcategory !== "all" && !(t.tags || []).includes(subcategory)) return false;
    
    if (rush && rush.length) {
      const ok = rush.some((r) => matchesKeywords(t, rushMatchers[r]));
      if (!ok) return false;
    }
    
    if (signals && signals.length) {
      const ok = signals.some((s) => matchesKeywords(t, signalMatchers[s]));
      if (!ok) return false;
    }
    
    return true;
  });
};

const getSubcategories = (terms, category) => {
  const categoryDefs = [
    { value: "all", label: "All", match: () => true },
    { value: "restaurant", label: "Restaurant", match: () => true },
    { value: "BOH", label: "Back of House", match: (t) => t.category === "BOH" },
    { value: "FOH", label: "Front of House", match: (t) => t.category === "FOH" },
    { value: "MANAGEMENT", label: "Management", match: (t) => t.category === "MANAGEMENT" },
    { value: "INVENTORY", label: "Inventory", match: (t) => t.category === "INVENTORY" },
    { value: "SERVICE", label: "Service", match: (t) => t.category === "SERVICE" },
    { value: "GENERAL", label: "General", match: (t) => t.category === "GENERAL" }
  ];

  const def = categoryDefs.find((d) => d.value === category) || categoryDefs[0];
  const scoped = terms.filter((t) => def.match(t));
  const subs = new Set();
  scoped.forEach((t) => {
    (t.tags || []).forEach((tag) => subs.add(tag));
  });
  return Array.from(subs).sort();
};

const getCategoryCounts = (terms) => {
  const categoryDefs = [
    { value: "all", label: "All", match: () => true },
    { value: "restaurant", label: "Restaurant", match: () => true },
    { value: "BOH", label: "Back of House", match: (t) => t.category === "BOH" },
    { value: "FOH", label: "Front of House", match: (t) => t.category === "FOH" },
    { value: "MANAGEMENT", label: "Management", match: (t) => t.category === "MANAGEMENT" },
    { value: "INVENTORY", label: "Inventory", match: (t) => t.category === "INVENTORY" },
    { value: "SERVICE", label: "Service", match: (t) => t.category === "SERVICE" },
    { value: "GENERAL", label: "General", match: (t) => t.category === "GENERAL" }
  ];

  return categoryDefs.map((c) => {
    const count = terms.filter((t) => c.match(t)).length;
    return { ...c, count };
  });
};

const getRushCounts = (terms) => {
  const rushMatchers = {
    "Hot": ["hot", "rush", "urgent", "priority", "fire"],
    "On The Fly": ["on the fly", "urgent", "priority", "rush"],
    "All Day": ["all day", "backlog", "queue", "aggregate", "count"],
    "86 Mode": ["86", "out", "deprec", "unavailable", "void"]
  };

  const counts = {};
  Object.keys(rushMatchers).forEach((label) => {
    counts[label] = terms.filter((t) => matchesKeywords(t, rushMatchers[label])).length;
  });
  return counts;
};

export {
  scoreTerm,
  matchesKeywords,
  filterTerms,
  getSubcategories,
  getCategoryCounts,
  getRushCounts
};