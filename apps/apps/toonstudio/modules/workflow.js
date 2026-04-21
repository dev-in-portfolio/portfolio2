  function setStep(step) {
    if (!STEPS.includes(step)) return;
    state.step = step;
    render();
  }

  function resetProject() {
    state.project = { style: "Pixar", concept: "", characters: [], storyboard: [] };
    state.demoOn = false;
    saveProject();
    setStep("SETUP");
  }

  function openSetup() {
    const modal = $("#ts-setup-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    const input = $("#ts-api-key");
    if (input) input.value = state.apiKey || "";
    input && input.focus();
  }

  function closeSetup() {
    const modal = $("#ts-setup-modal");
    modal && modal.classList.add("hidden");
  }

  function saveKey() {
    const input = $("#ts-api-key");
    const key = (input && input.value || "").trim();
    state.apiKey = key;
    try { localStorage.setItem(LS.key, key); } catch {}
    closeSetup();
    render();
    serverLoadLatest();
  }

  function maskKey(key) {
    if (!key) return "Not connected";
    if (key.length <= 6) return "••••••";
    return "•••• " + key.slice(-4);
  }

  function demo() {
    state.demoOn = true;
    state.project.style = "Pixar";
    state.project.concept = "A tiny, overly-confident squirrel director tries to film an epic space opera inside a shoebox.";
    state.project.characters = [
      { id: "c1", name: "Captain Nutbeam", description: "Heroic squirrel captain with dramatic speeches and a tiny cape." },
      { id: "c2", name: "Gizmo the Firefly", description: "Neon sidekick that provides lighting, sass, and navigation." },
      { id: "c3", name: "The Shoebox Galaxy", description: "A cardboard universe full of glitter, tape, and impossible stakes." }
    ];
    state.project.storyboard = [
      { id: "s1", title: "Cold Open", visual: "Starfield inside the shoebox. Captain Nutbeam vows glory.", beats: ["Establish world", "Introduce hero", "Inciting incident"] },
      { id: "s2", title: "The Rift", visual: "A tear in the cardboard reveals a bigger universe.", beats: ["Discovery", "Decision", "Countdown"] },
      { id: "s3", title: "Finale", visual: "Epic battle… with craft supplies.", beats: ["Climax", "Twist", "Triumphant button"] }
    ];
    saveProject();
    setStep("CHARACTERS");
  }

  async function generateScriptSuggestion() {
    // Backend-present UX: behave cleanly even if offline.
    // For now: in-browser call if key is present; otherwise deterministic demo suggestion.
    const concept = state.project.concept.trim();
    if (!concept) return setError("Add a concept first.");
    state.loading = true; render();

    try {
      if (!state.apiKey) {
        // Offline-safe suggestion
        state.project.storyboard = [
          { id: "s1", title: "Setup", visual: "Introduce tone and protagonist.", beats: ["Hook", "Character", "Goal"] },
          { id: "s2", title: "Conflict", visual: "Obstacle escalates.", beats: ["Complication", "Choice", "Risk"] },
          { id: "s3", title: "Payoff", visual: "Resolution with Pixar-style heart.", beats: ["Climax", "Emotion", "Tag"] },
        ];
        saveProject();
        setStep("STORYBOARD");
        return;
      }

      // Call Gemini REST directly (works if browser allows). If blocked, we fail gracefully.
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + encodeURIComponent(state.apiKey);
      const prompt = `You are ToonStudio. Create a 3-scene storyboard outline (title + visual description + 3 beats) for this concept:\n\n${concept}\n\nReturn JSON with: scenes:[{id,title,visual,beats:[..]}].`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error("Service temporarily unavailable (" + res.status + ")");
      const data = await res.json();
