const renderBestMatch = (term, secondary = [], fallback = [], dir = "rest-to-tech") => {
  const target = document.querySelector("[data-result]");
  if (!target) return;
  if (!term) {
    if (fallback.length) {
      target.innerHTML = `
        <div class="result-meta">Ready — Top Terms</div>
        <ul class="result-list">
          ${fallback.map((s) => `<li data-term-link="${s.slug}">${s.term} — ${s.techEquivalent[0] || ""}</li>`).join("")}
        </ul>
      `;
      return;
    }
    target.innerHTML = "<div class='muted'>No match yet.</div>";
    return;
  }
  const primaryLabel = dir === "rest-to-tech" ? "Restaurant" : "Tech";
  const secondaryLabel = dir === "rest-to-tech" ? "Tech" : "Restaurant";
  const primaryDef = dir === "rest-to-tech" ? term.definitionRestaurant : term.definitionTech;
  const secondaryDef = dir === "rest-to-tech" ? term.definitionTech : term.definitionRestaurant;
  target.innerHTML = `
    <div class="plating-badge"><span class="armed-dot"></span>Plating Window</div>
    <div class="result-best">${term.term}</div>
    <div class="result-meta">${term.category} • ${term.techEquivalent.join(", ")}</div>
    <div class="result-meta">${primaryLabel}: ${primaryDef}</div>
    <div class="result-meta">${secondaryLabel}: ${secondaryDef}</div>
    ${secondary.length ? `
      <div class="result-meta">Secondary Matches</div>
      <ul class="result-list">
        ${secondary.map((s) => `<li>${s.term} — ${s.techEquivalent[0] || ""}</li>`).join("")}
      </ul>
    ` : ""}
  `;
};

const renderTermCard = (term) => {
  return `
    <article class="term-card" data-term-card data-category="${term.category}" data-tags="${term.tags.join(",")}" data-search="${term.term.toLowerCase()} ${term.techEquivalent.join(" ").toLowerCase()} ${term.tags.join(" ").toLowerCase()}">
      <div class="term-title"><a href="/terms/${term.slug}">${term.term}</a></div>
      <div class="term-meta">${term.category} • ${term.techEquivalent.join(", ")}</div>
      <div class="term-desc">${term.definitionRestaurant}</div>
      <div class="controls">
        <button class="btn-ghost" data-fav="${term.slug}">Favorite</button>
      </div>
    </article>
  `;
};

const renderPhraseExample = (example, direction) => {
  const [restaurant, tech] = direction === "rest-to-tech" ? example : [example[1], example[0]];
  return `
    <div class="phrase-example">
      <div class="phrase-restaurant">${restaurant}</div>
      <div class="phrase-tech">${tech}</div>
    </div>
  `;
};

const renderWhyThisWorks = (term, direction) => {
  const primaryLabel = direction === "rest-to-tech" ? "Restaurant" : "Tech";
  const secondaryLabel = direction === "rest-to-tech" ? "Tech" : "Restaurant";
  
  return `
    <div class="why-this-works">
      <h4>Why This Translation Works</h4>
      <p>This term maps ${primaryLabel} <strong>${term.term}</strong> to ${secondaryLabel} <strong>${term.techEquivalent[0]}</strong> because:</p>
      <ul>
        <li><strong>Context:</strong> ${term.context || "General context"}</li>
        <li><strong>Tone:</strong> ${term.tone || "Neutral"}</li>
        <li><strong>Role relevance:</strong> ${term.roleRelevance || "All roles"}</li>
      </ul>
      ${term.falseFriends && term.falseFriends.length ? `
        <div class="false-friends">
          <h5>Avoid These False Friends</h5>
          <ul>
            ${term.falseFriends.map(f => `<li>${f}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
    </div>
  `;
};

export {
  renderBestMatch,
  renderTermCard,
  renderPhraseExample,
  renderWhyThisWorks
};