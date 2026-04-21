  function generateVerdict() {
    const voteResults = {};
    let yes=0,no=0,maybe=0;
    AGENTS.forEach(a => {
      const forced = state.manualVotes[a.id];
      let v = forced;
      if (!v) {
        const text = (state.dilemma||"").toLowerCase();
        const bias = (text.includes("quit")||text.includes("ship")) ? "YES" :
                     (text.includes("wait")||text.includes("stable")) ? "NO" : "MAYBE";
        const roll = (a.id.charCodeAt(0)+Math.floor(state.tension)) % 3;
        v = roll===0 ? bias : (roll===1 ? "MAYBE" : (bias==="YES"?"NO":"YES"));
      }
      voteResults[a.id]=v;
      if (v==="YES") yes++; else if (v==="NO") no++; else maybe++;
    });
    const decision = yes>no ? "YES" : no>yes ? "NO" : "MAYBE";
    const summary = decision==="YES"
      ? "Verdict: Do it. The Council wants velocity — but stage the risk."
      : decision==="NO"
        ? "Verdict: Hold. Secure runway, then strike with better positioning."
        : "Verdict: Split the difference. Pilot small, learn fast, decide in 14 days.";
    state.verdict={summary, voteResults};
  }

