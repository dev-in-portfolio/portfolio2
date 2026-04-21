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
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Sync queued — try again.");
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed?.scenes?.length) throw new Error("Sync queued — try again.");
      state.project.storyboard = parsed.scenes.map((s, i) => ({
        id: s.id || ("s" + (i+1)),
        title: s.title || ("Scene " + (i+1)),
        visual: s.visual || "",
        beats: Array.isArray(s.beats) ? s.beats.slice(0, 5) : []
      }));
      saveProject();
      setStep("STORYBOARD");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      state.loading = false; render();
    }
  }

  function exportProject() {
    // Guard against double-taps / duplicated click events on mobile.
    const now = Date.now();
    if (state.__exportCooldownUntil && now < state.__exportCooldownUntil) return;
    state.__exportCooldownUntil = now + 2000;

    // Demo mode does not export. Prompt the user to add their own key and create a project.
    if (state.demoOn) {
      openSetup();
      const desc = document.getElementById("ts-setup-desc");
      if (desc) desc.textContent = "Insert your key and make your own project to export.";
      return;
    }

    const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "toonstudio_project.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function importProject(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed) throw new Error("Invalid file");
      state.project = {
        style: parsed.style || "Pixar",
        concept: parsed.concept || "",
