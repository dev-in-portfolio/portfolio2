// Inbox Module - Response management and analytics

export async function initInboxModule(state) {
  console.log('Initializing Inbox Module');
  
  // Set up event listeners
  setupInboxEventListeners(state);
}

function setupInboxEventListeners(state) {
  // Export button
  document.getElementById('export-responses')?.addEventListener('click', () => {
    exportResponses(state);
  });
  
  // Filter controls
  document.getElementById('filter-responses')?.addEventListener('input', (e) => {
    filterResponses(state, e.target.value);
  });
}

export async function loadResponses(formId, state) {
  try {
    const data = await window.FormFoundry.apiFetch(`/api/forms/${formId}/responses`);
    state.responses = data.responses || [];
    renderInboxInterface(state);
    return state.responses;
    
  } catch (err) {
    console.error('Error loading responses:', err);
    window.FormFoundry.showError(err.message);
    return [];
  }
}

function renderInboxInterface(state) {
  if (!state.activeForm) {
    document.getElementById('inbox-content').innerHTML = 
      '<p class="status">Select a form to view its responses</p>';
    return;
  }
  
  const form = state.activeForm;
  const inboxContent = document.getElementById('inbox-content');
  
  // Calculate statistics
  const stats = calculateResponseStats(state.responses);
  
  inboxContent.innerHTML = `
    <div class="inbox-header">
      <h3>${form.name}</h3>
      <div class="inbox-stats">
        <div class="stat-card">
          <strong>${stats.total}</strong>
          <span>Total Responses</span>
        </div>
        <div class="stat-card">
          <strong>${stats.completed}</strong>
          <span>Completed</span>
        </div>
        <div class="stat-card">
          <strong>${stats.completionRate}%</strong>
          <span>Completion Rate</span>
        </div>
        <div class="stat-card">
          <strong>${stats.avgTime}</strong>
          <span>Avg Completion (min)</span>
        </div>
      </div>
      
      <div class="inbox-actions">
        <button id="export-responses" class="btn-primary">
          <i class="fas fa-download"></i> Export CSV
        </button>
        <input type="text" id="filter-responses" placeholder="🔍 Filter responses...">
        <select id="response-status-filter">
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="partial">Partial</option>
        </select>
      </div>
    </div>
    
    <div id="responses-grid" class="responses-grid"></div>
  `;
  
  renderResponsesList(state);
  setupInboxEventListeners(state);
}

function calculateResponseStats(responses) {
  if (responses.length === 0) {
    return { total: 0, completed: 0, completionRate: 0, avgTime: 0 };
  }
  
  const completed = responses.filter(r => r.status === 'completed').length;
  const completionRate = Math.round((completed / responses.length) * 100);
  
  // Calculate average completion time (simplified)
  const times = responses
    .filter(r => r.completed_at && r.started_at)
    .map(r => {
      const start = new Date(r.started_at);
      const end = new Date(r.completed_at);
      return (end - start) / (1000 * 60); // minutes
    });
  
  const avgTime = times.length > 0 
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;
  
  return { 
    total: responses.length, 
    completed, 
    completionRate, 
    avgTime 
  };
}

function renderResponsesList(state) {
  const responsesGrid = document.getElementById('responses-grid');
  if (!responsesGrid) return;
  
  if (state.responses.length === 0) {
    responsesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No responses yet</h3>
        <p>Share your form to start collecting responses</p>
      </div>
    `;
    return;
  }
  
  const filterQuery = document.getElementById('filter-responses')?.value || '';
  const statusFilter = document.getElementById('response-status-filter')?.value || 'all';
  
  // Filter responses
  let filteredResponses = state.responses;
  
  if (filterQuery) {
    filteredResponses = filteredResponses.filter(response =>
      JSON.stringify(response.response).toLowerCase().includes(filterQuery.toLowerCase())
    );
  }
  
  if (statusFilter !== 'all') {
    filteredResponses = filteredResponses.filter(response => 
      response.status === statusFilter
    );
  }
  
  responsesGrid.innerHTML = filteredResponses.map((response, index) => `
    <div class="response-card" data-response-id="${response.id}">
      <div class="response-header">
        <span class="response-id">#${response.id.substring(0, 8)}</span>
        <span class="response-status ${response.status}">${response.status}</span>
        <span class="response-date">${window.FormFoundry.formatDate(response.submitted_at)}</span>
      </div>
      
      <div class="response-preview">
        <pre>${JSON.stringify(response.response, null, 2)}</pre>
      </div>
      
      <div class="response-actions">
        <button class="btn-view-details" data-id="${response.id}">
          <i class="fas fa-eye"></i> Details
        </button>
        <button class="btn-export-single" data-id="${response.id}">
          <i class="fas fa-download"></i> Export
        </button>
        <button class="btn-delete-response" data-id="${response.id}">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `).join('');
  
  // Set up action buttons
  setupResponseActions(state);
}

function setupResponseActions(state) {
  // View details buttons
  document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const responseId = e.target.dataset.id;
      viewResponseDetails(responseId, state);
    });
  });
  
  // Export single response buttons
  document.querySelectorAll('.btn-export-single').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const responseId = e.target.dataset.id;
      exportSingleResponse(responseId, state);
    });
  });
  
  // Delete response buttons
  document.querySelectorAll('.btn-delete-response').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const responseId = e.target.dataset.id;
      deleteResponse(responseId, state);
    });
  });
}

function viewResponseDetails(responseId, state) {
  const response = state.responses.find(r => r.id === responseId);
  if (response) {
    // Show detailed view (modal or expanded view)
    alert('Detailed view would show here: ' + JSON.stringify(response, null, 2));
  }
}

function exportSingleResponse(responseId, state) {
  const response = state.responses.find(r => r.id === responseId);
  if (response) {
    const csvData = convertResponseToCSV(response);
    downloadCSV(csvData, `response_${responseId}.csv`);
    window.FormFoundry.showSuccess('Response exported!');
  }
}

function exportResponses(state) {
  if (state.responses.length === 0) {
    window.FormFoundry.showError('No responses to export');
    return;
  }
  
  const csvData = convertResponsesToCSV(state.responses);
  downloadCSV(csvData, `responses_${state.activeForm.id}.csv`);
  window.FormFoundry.showSuccess('All responses exported!');
}

function convertResponseToCSV(response) {
  // Convert single response to CSV format
  const headers = Object.keys(response.response);
  const values = Object.values(response.response);
  
  return [
    ['Response ID', response.id],
    ['Submitted At', response.submitted_at],
    ['Status', response.status],
    [],
    headers.join(','),
    values.map(v => `"${v}"`).join(',')
  ].join('\n');
}

function convertResponsesToCSV(responses) {
  if (responses.length === 0) return '';
  
  // Find all unique keys across all responses
  const allKeys = new Set();
  responses.forEach(response => {
    Object.keys(response.response || {}).forEach(key => allKeys.add(key));
  });
  
  // Create CSV header
  const headers = ['response_id', 'submitted_at', 'status', ...Array.from(allKeys)];
  
  // Create CSV rows
  const rows = responses.map(response => {
    const row = [
      response.id,
      response.submitted_at,
      response.status
    ];
    
    // Add response data
    Array.from(allKeys).forEach(key => {
      const value = response.response?.[key] || '';
      row.push(`"${String(value).replace(/"/g, '""')}"`);
    });
    
    return row.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csvData, filename) {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
}

async function deleteResponse(responseId, state) {
  if (confirm('Are you sure you want to delete this response? This cannot be undone.')) {
    try {
      await window.FormFoundry.apiFetch(`/api/responses/${responseId}`, {
        method: 'DELETE'
      });
      
      // Remove from state
      state.responses = state.responses.filter(r => r.id !== responseId);
      renderResponsesList(state);
      window.FormFoundry.showSuccess('Response deleted!');
      
    } catch (err) {
      console.error('Error deleting response:', err);
      window.FormFoundry.showError(err.message);
    }
  }
}

function filterResponses(state, searchQuery) {
  renderResponsesList(state);
}
