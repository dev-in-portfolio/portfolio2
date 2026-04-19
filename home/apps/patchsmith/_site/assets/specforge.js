async function loadIndex() {
  try {
    const res = await fetch('/_spec_index.json');
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
        <h3><a href="/specs/${item.id}/">${item.title}</a></h3>
        <p>${item.excerpt}</p>
        <div class="meta">
          <span class="owner">${item.owner}</span>
          <span class="status status-${item.status}">${item.status}</span>
          <span class="date">${item.updated_at}</span>
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
  const status = document.getElementById('status-filter');
  const owner = document.getElementById('owner-filter');
  const tag = document.getElementById('tag-filter');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  loadIndex().then((index) => {
    const apply = () => {
      const query = input.value.toLowerCase();
      const statusValue = status ? status.value : '';
      const ownerValue = owner ? owner.value : '';
      const tagValue = tag ? tag.value : '';
      
      const filtered = index.filter((item) => {
        const matchesQuery =
          item.title.toLowerCase().includes(query) ||
          item.excerpt.toLowerCase().includes(query) ||
          (item.tags || []).join(' ').toLowerCase().includes(query);
        const matchesStatus = statusValue ? item.status === statusValue : true;
        const matchesOwner = ownerValue ? item.owner === ownerValue : true;
        const matchesTag = tagValue ? (item.tags || []).includes(tagValue) : true;
        return matchesQuery && matchesStatus && matchesOwner && matchesTag;
      });
      renderResults(results, query || statusValue || ownerValue || tagValue ? filtered : index.slice(0, 6));
    };

    input.addEventListener('input', apply);
    if (status) status.addEventListener('change', apply);
    if (owner) owner.addEventListener('change', apply);
    if (tag) tag.addEventListener('change', apply);
    renderResults(results, index.slice(0, 6));
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
  attachKeyboardNav();
});
