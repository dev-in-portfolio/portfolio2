const initFavorites = async () => {
  const { loadFavorites, favoriteCache } = await import("./state.js");
  
  await loadFavorites();
  
  const favButtons = document.querySelectorAll("[data-fav]");
  favButtons.forEach((btn) => {
    const slug = btn.getAttribute("data-fav");
    btn.textContent = favoriteCache.includes(slug) ? "Favorited" : "Favorite";
  });
};

const initFavoritesPage = async () => {
  const { loadTerms, loadFavorites } = await import("./state.js");
  const { renderTermCard } = await import("./renderers.js");
  
  const list = document.querySelector("[data-fav-list]");
  const empty = document.querySelector("[data-fav-empty]");
  if (!list) return;
  
  const terms = await loadTerms();
  const favorites = await loadFavorites();
  const items = terms.filter((t) => favorites.includes(t.slug));
  
  if (!items.length) {
    if (empty) empty.hidden = false;
    return;
  }
  
  if (empty) empty.hidden = true;
  list.innerHTML = items.map((t) => renderTermCard(t)).join("");
};

const initFavoriteClicks = async () => {
  const { toggleFavorite } = await import("./state.js");
  
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-fav]");
    if (!btn) return;
    const slug = btn.getAttribute("data-fav");
    const next = await toggleFavorite(slug);
    btn.textContent = next.includes(slug) ? "Favorited" : "Favorite";
  });
};

export { initFavorites, initFavoritesPage, initFavoriteClicks };