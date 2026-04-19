document.addEventListener("DOMContentLoaded", async () => {
  const { initTranslator } = await import("./translator.js");
  const { initTermFilters } = await import("./term-filters.js");
  const { initFavorites, initFavoritesPage, initFavoriteClicks } = await import("./favorites.js");
  const { initContribute } = await import("./custom-terms.js");
  const { initCopyButtons } = await import("./utils.js");

  initTranslator();
  initTermFilters();
  initFavorites();
  initFavoriteClicks();
  initFavoritesPage();
  initCopyButtons();
  initContribute();
});
