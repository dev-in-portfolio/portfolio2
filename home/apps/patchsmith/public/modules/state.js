// State Management Module
const state = {
  forms: [],
  activeForm: null,
  activeSchema: null,
  responses: [],
  analytics: null,
  currentView: 'forms', // 'forms', 'builder', 'inbox', 'public'
  filters: {
    status: 'all',
    search: '',
    dateRange: null,
  },
};

function setActiveForm(form) {
  state.activeForm = form;
  state.activeSchema = form ? { ...form.schema } : null;
}

function updateResponseStatus(responseId, newStatus) {
  const response = state.responses.find(r => r.id === responseId);
  if (response) {
    response.status = newStatus;
  }
}

function applyFilters() {
  let filtered = state.forms;
  
  if (state.filters.status !== 'all') {
    filtered = filtered.filter(form => form.status === state.filters.status);
  }
  
  if (state.filters.search) {
    const searchTerm = state.filters.search.toLowerCase();
    filtered = filtered.filter(form => 
      form.name.toLowerCase().includes(searchTerm) ||
      form.id.includes(searchTerm)
    );
  }
  
  return filtered;
}

function resetFilters() {
  state.filters = {
    status: 'all',
    search: '',
    dateRange: null,
  };
}

export { state, setActiveForm, updateResponseStatus, applyFilters, resetFilters };