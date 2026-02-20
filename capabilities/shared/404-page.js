(() => {
  const bodyApp = document.body && document.body.dataset && document.body.dataset.app;
  const path = (location.pathname || "").toLowerCase();

  const apps = [
    "aeon","helios","helix",
    "magma","string","tectonic","transit","vortex",
    "coverage-compass","ubr","alibi"
  ];

  let app = bodyApp || "global";
  if (!bodyApp) {
    for (const a of apps) {
      if (path.includes(`/${a}`)) { app = a; break; }
    }
  }

  // IMPORTANT: 404 pages exist both at root (/404.html) and under /404/<app>/.
  // Use absolute paths so the asset URLs resolve correctly in both cases.
  const img = document.getElementById("hero");
  if (img) img.src = `/assets/404_images/${app}/hero.png`;

  const msgEl = document.getElementById("msg");
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const fallback = () => {
    if (!msgEl) return;
    const pool = [
      "Nexus couldn’t find that route. If you were expecting an app, use the buttons below.",
      "This path isn’t mapped. The good news: the real stuff is one click away.",
      "404. Not broken — just not wired yet. Jump back to Nexus or open an app."
    ];
    msgEl.textContent = pick(pool);
  };

  if (!msgEl) return;

  (async () => {
    try {
      const r = await fetch(`/assets/404_images/${app}/messages.json`, { cache: "no-store" });
      if (!r.ok) return null;
      const data = await r.json();
      if (!data) { fallback(); return; }
      const list = Array.isArray(data) ? data : (data && data.messages) ? data.messages : [];
      const msg = list.length ? pick(list) : null;
      if (msg) msgEl.textContent = msg;
      else fallback();
    } catch (e) {
      fallback();
    }
  })();
})();
