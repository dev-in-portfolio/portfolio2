const initCopyButtons = () => {
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.getAttribute("data-copy");
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = `Copy ${text}`), 1200);
    } catch {
      // ignore
    }
  });
};

export { initCopyButtons };