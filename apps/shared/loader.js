// shared/loader.js (tree-first)
window.TreeFirst = window.TreeFirst || {};
window.TreeFirst.fetchJson = async (url) => {
  const r = await fetch(url, {cache:'no-store'});
  if (!r.ok) console.warn('HTTP '+r.status+' for '+url); return;
  return await r.json();
};
