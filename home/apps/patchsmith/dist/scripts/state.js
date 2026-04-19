const STORAGE = {
  userKey: "itt.userKey",
  favorites: "itt.favorites",
  customTerms: "itt.customTerms"
};

const getUserKey = () => {
  let key = localStorage.getItem(STORAGE.userKey);
  if (!key) {
    key = (crypto?.randomUUID?.() || `itt_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(STORAGE.userKey, key);
  }
  return key;
};

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const apiRequest = async (path, method, body) => {
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error("bad status");
    return await res.json();
  } catch {
    return null;
  }
};

let favoriteCache = [];

const loadFavorites = async () => {
  const userKey = getUserKey();
  const server = await apiRequest(`/api/favorites?userKey=${encodeURIComponent(userKey)}`, "GET");
  if (server && Array.isArray(server.favorites)) {
    writeJSON(STORAGE.favorites, server.favorites);
    favoriteCache = server.favorites;
    return favoriteCache;
  }
  favoriteCache = readJSON(STORAGE.favorites, []);
  return favoriteCache;
};

const toggleFavorite = async (slug) => {
  const userKey = getUserKey();
  const current = readJSON(STORAGE.favorites, []);
  const has = current.includes(slug);
  let next;
  if (has) {
    next = current.filter((s) => s !== slug);
    const server = await apiRequest("/api/favorites", "DELETE", { userKey, term_slug: slug });
    if (server && Array.isArray(server.favorites)) next = server.favorites;
  } else {
    next = [...current, slug];
    const server = await apiRequest("/api/favorites", "POST", { userKey, term_slug: slug });
    if (server && Array.isArray(server.favorites)) next = server.favorites;
  }
  writeJSON(STORAGE.favorites, next);
  return next;
};

const saveCustomTerm = async (term) => {
  const userKey = getUserKey();
  const server = await apiRequest("/api/custom-terms", "POST", { userKey, term });
  if (server && Array.isArray(server.terms)) {
    return server.terms;
  }
  const local = readJSON(STORAGE.customTerms, []);
  local.unshift({ ...term, _localOnly: true, _id: Date.now() });
  writeJSON(STORAGE.customTerms, local);
  return local;
};

const loadCustomTerms = async () => {
  const userKey = getUserKey();
  const server = await apiRequest(`/api/custom-terms?userKey=${encodeURIComponent(userKey)}`, "GET");
  if (server && Array.isArray(server.terms)) {
    return server.terms.map((t) => ({ ...t.payload, _id: t.id }));
  }
  return readJSON(STORAGE.customTerms, []).map((t) => ({ ...t }));
};

const loadTerms = async () => {
  const res = await fetch("/data/terms.json");
  const terms = await res.json();
  const custom = await loadCustomTerms();
  return [...terms, ...custom.map((t) => ({ ...t, _localOnly: true }))];
};

export {
  getUserKey,
  readJSON,
  writeJSON,
  apiRequest,
  loadFavorites,
  toggleFavorite,
  saveCustomTerm,
  loadCustomTerms,
  loadTerms,
  favoriteCache
};