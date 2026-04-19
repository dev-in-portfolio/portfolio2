async function loadIndex() {
  try {
    const res = await fetch('/items/items-index.json');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderResults(container, results) {
  container.innerHTML = results
    .map((item, index) => {
      const tags = (item.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('');
      return `
      <article class="card catalog-card" data-category="${escapeHtml(item.category)}">
        <div class="card-topline">
          <span class="card-kicker">${escapeHtml(item.category)}</span>
          <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
        </div>
        <h3><a href="/items/${escapeHtml(item.slug)}/">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.summary)}</p>
        <div class="tags">
          ${tags}
        </div>
      </article>
    `;
    })
    .join('');
}

function attachCatalogSearch() {
  const input = document.getElementById('search-input');
  const select = document.getElementById('category-filter');
  const results = document.getElementById('catalog-results');
  const pagination = document.getElementById('pagination-controls');
  if (!input || !results) return;

  const originalHTML = results.innerHTML;

  loadIndex().then((index) => {
    const applyFilter = () => {
      const query = input.value.toLowerCase();
      const category = select ? select.value : '';
      const isActive = query !== '' || category !== '';

      if (!isActive) {
        results.innerHTML = originalHTML;
        if (pagination) pagination.style.display = '';
        return;
      }

      if (pagination) pagination.style.display = 'none';
      const filtered = index.filter((item) => {
        const matchesQuery =
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          (item.tags || []).join(' ').toLowerCase().includes(query);
        const matchesCategory = category ? item.category === category : true;
        return matchesQuery && matchesCategory;
      });
      renderResults(results, filtered);
    };

    input.addEventListener('input', applyFilter);
    if (select) select.addEventListener('change', applyFilter);
    
    // Check URL params for initial state
    const params = new URLSearchParams(window.location.search);
    if (params.has('q')) {
      input.value = params.get('q');
      applyFilter();
    } else if (params.has('category')) {
      if (select) select.value = params.get('category');
      applyFilter();
    }
  });
}

document.addEventListener('DOMContentLoaded', attachCatalogSearch);
