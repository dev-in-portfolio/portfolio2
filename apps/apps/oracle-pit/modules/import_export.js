  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const d = parsed.data || parsed;
        state.dilemma = d.dilemma || "";
        state.tension = typeof d.tension === "number" ? d.tension : 42;
        state.history = Array.isArray(d.history) ? d.history : [];
        state.verdict = d.verdict || null;
        state.manualVotes = d.manualVotes || {};
        state.agentSettings = d.agentSettings || state.agentSettings;
        save();
        setToast("Imported.");
        render();
      } catch (e) {
        setToast("Import failed.");
      }
    };
    reader.readAsText(file);
  }

  function mkTurn(agent, dilemma) {
    const seed = (dilemma + agent.id).split("").reduce((a,c)=>a + c.charCodeAt(0), 0);
    const r = seed % 5;
    const lines = {
      INVESTOR: [
        "ROI first: take the path that compounds optionality.",
        "Ship now. Momentum is leverage. Perfect is expensive.",
        "Stability is runway. Six months buys better positioning.",
        "If it doesn't monetize or unlock distribution, it’s a hobby."
      ],
      ARTIST: [
        "Burn the map. Choose the thing that feels alive.",
        "Perfection is fear in a tuxedo. Release it.",
        "Take the weird path. The story matters more than the salary.",
        "Comfort is a cage. Rip a hole in it."
      ],
      CONSPIRACIST: [
        "Ask who benefits. Then assume it’s worse than you think.",
        "If the choice feels forced, it’s engineered.",
        "The safest option is usually the trap with better branding.",
        "Follow the incentives. They never lie."
      ],
      ENGINEER: [
        "Define constraints, ship an MVP, and iterate with metrics.",
        "Reduce risk: stage it. Partial refactor, not a rewrite.",
        "Make it runnable as-shipped. Then optimize.",
        "Failure modes first. Then the pretty."
      ],
      PRIEST: [
        "Choose what you can live with at 3am.",
        "Your values are the backend. Keep them online.",
        "The cleanest choice is the one that reduces harm.",
        "Listen to the quiet yes."
      ]
    };
    const bucket = lines[agent.id] || ["State your dilemma. The Council will decide."];
    return bucket[r % bucket.length] + " — " + agent.role + ".";
  }
