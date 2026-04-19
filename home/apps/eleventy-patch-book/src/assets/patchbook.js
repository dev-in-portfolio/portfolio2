async function loadIndex() {
  try {
    const res = await fetch('/_patch_index.json');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function renderResults(container, results) {
  container.innerHTML = results
    .map(
      (item) => `
      <article class="card">
        <h3><a href="/patches/${item.slug}/">${item.title}</a></h3>
        <p>${item.excerpt}</p>
        <div class="meta">
          <span class="risk risk-${item.risk}">${item.risk}</span>
          {% if item.environment %}<span class="env">${item.environment}</span>{% endif %}
          {% if item.version_range %}<span class="version">${item.version_range}</span>{% endif %}
        </div>
        <div class="tags">
          ${(item.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>
      </article>
    `
    )
    .join('');
}

function attachSearch() {
  const input = document.getElementById('search-input');
  const risk = document.getElementById('risk-filter');
  const environment = document.getElementById('environment-filter');
  const tag = document.getElementById('tag-filter');
  const version = document.getElementById('version-filter');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  loadIndex().then((index) => {
    const apply = () => {
      const query = input.value.toLowerCase();
      const riskValue = risk ? risk.value : '';
      const environmentValue = environment ? environment.value : '';
      const tagValue = tag ? tag.value : '';
      const versionValue = version ? version.value : '';
      
      const filtered = index.filter((item) => {
        const matchesQuery =
          item.title.toLowerCase().includes(query) ||
          item.excerpt.toLowerCase().includes(query) ||
          (item.tags || []).join(' ').toLowerCase().includes(query);
        const matchesRisk = riskValue ? item.risk === riskValue : true;
        const matchesEnvironment = environmentValue ? item.environment === environmentValue : true;
        const matchesTag = tagValue ? (item.tags || []).includes(tagValue) : true;
        const matchesVersion = versionValue ? item.version_range === versionValue : true;
        return matchesQuery && matchesRisk && matchesEnvironment && matchesTag && matchesVersion;
      });
      
      filtered.sort((a, b) => {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0);
      });
      
      renderResults(results, query || riskValue || environmentValue || tagValue || versionValue ? filtered : index.slice(0, 6));
    };

    input.addEventListener('input', apply);
    if (risk) risk.addEventListener('change', apply);
    if (environment) environment.addEventListener('change', apply);
    if (tag) tag.addEventListener('change', apply);
    if (version) version.addEventListener('change', apply);
    renderResults(results, index.slice(0, 6));
  });
}

function attachCopyButtons() {
  document.querySelectorAll('pre code').forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.querySelector('.copy-btn')) return;
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.textContent = 'Copy';
    button.onclick = async () => {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'Copy'), 1000);
    };
    pre.appendChild(button);
  });
}

function attachKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      const input = document.getElementById('search-input');
      if (input) input.focus();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachSearch();
  attachCopyButtons();
  attachKeyboardNav();
});
