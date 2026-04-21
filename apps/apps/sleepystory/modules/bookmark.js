    if (!currentStory) return;
    const bm = { storyTitle: currentStory.title, pageIndex: currentPage, savedAt: Date.now() };
    localStorage.setItem(LS_BOOKMARK, JSON.stringify(bm));
    scheduleServerSync();
    el("#status").textContent = `Bookmarked page ${currentPage + 1}.`;
  }

  function exportData() {
    const payload = {
      apiKey: (localStorage.getItem(LS_KEY) || "").trim(),
      bookmark: getBookmark(),
      lastTopic: localStorage.getItem(LS_LAST_TOPIC) || "",
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sleepystory-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || "{}"));
          if (typeof data.apiKey === "string") localStorage.setItem(LS_KEY, data.apiKey);
          if (data.bookmark) localStorage.setItem(LS_BOOKMARK, JSON.stringify(data.bookmark));
          if (typeof data.lastTopic === "string") localStorage.setItem(LS_LAST_TOPIC, data.lastTopic);
          el("#status").textContent = "Imported. Ready.";
        } catch {
          el("#error").textContent = "Import failed (bad file).";
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function wireKeyModal() {
    const modal = el("#keyModal");
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeKeyModal();
    });
    el("#keyCancel").addEventListener("click", closeKeyModal);
    el("#keySave").addEventListener("click", () => {
      const v = (el("#apiKeyInput").value || "").trim();
      if (v) localStorage.setItem(LS_KEY, v);
      else localStorage.removeItem(LS_KEY);
      el("#apiKeySaved").textContent = v ? `Saved: ${maskKey(v)}` : "No key saved yet.";
      closeKeyModal();
      // re-render studio if we were gated
      ensureKeyOrGate().then((ok) => { if (ok) renderStudio(); });
    });
  }

  async function boot() {
    wireKeyModal();
    const ok = await ensureKeyOrGate();
    if (ok) renderStudio();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
