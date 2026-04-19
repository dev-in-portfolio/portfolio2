document.addEventListener('DOMContentLoaded', function() {
  const items = JSON.parse(document.getElementById('items-data').textContent);
  const resultsContainer = document.getElementById('filter-results');
  
  function renderItems(filteredItems) {
    resultsContainer.innerHTML = '';
    filteredItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'item-card';
      div.innerHTML = `
        <h3><a href="/items/${item.slug}/">${item.title}</a></h3>
        <p>${item.summary}</p>
        <div class="meta">
          <span class="category">${item.category}</span>
          <span class="owner">${item.owner}</span>
          <span class="status">${item.status}</span>
        </div>
        <div class="tags">
          ${item.tags.map(tag => `<span>${tag}</span>`).join('')}
        </div>
      `;
      resultsContainer.appendChild(div);
    });
  }
  
  function filterItems() {
    const category = document.getElementById('category-filter').value;
    const tag = document.getElementById('tag-filter').value;
    const status = document.getElementById('status-filter').value;
    const source = document.getElementById('source-filter').value;
    
    let filtered = items;
    
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (tag) {
      filtered = filtered.filter(item => item.tags.includes(tag));
    }
    
    if (status) {
      filtered = filtered.filter(item => item.status === status);
    }
    
    if (source) {
      filtered = filtered.filter(item => item.source === source);
    }
    
    renderItems(filtered);
  }
  
  document.getElementById('category-filter').addEventListener('change', filterItems);
  document.getElementById('tag-filter').addEventListener('change', filterItems);
  document.getElementById('status-filter').addEventListener('change', filterItems);
  document.getElementById('source-filter').addEventListener('change', filterItems);
  
  renderItems(items);
});