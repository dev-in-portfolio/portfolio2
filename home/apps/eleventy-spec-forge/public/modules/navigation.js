// Navigation Module - Handles view switching and routing

export function initNavigation(state) {
  console.log('Initializing Navigation Module');
  
  // Set up navigation buttons
  setupNavButtons(state);
  
  // Handle initial route
  handleInitialRoute(state);
}

function setupNavButtons(state) {
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (view) {
        switchView(view, state);
      }
    });
  });
}

function handleInitialRoute(state) {
  // Check URL hash for initial view
  const hash = window.location.hash.substring(1);
  if (hash && ['forms', 'builder', 'inbox', 'public'].includes(hash)) {
    state.currentView = hash;
  }
  
  // Update active view
  updateActiveView(state);
}

export function switchView(view, state) {
  state.currentView = view;
  window.location.hash = view;
  updateActiveView(state);
}

function updateActiveView(state) {
  // Hide all views
  document.querySelectorAll('.view-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the active view
  const activeSection = document.getElementById(`${state.currentView}-view`);
  if (activeSection) {
    activeSection.style.display = 'block';
  }
  
  // Update navigation
  updateNavigation(state);
}

function updateNavigation(state) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === state.currentView) {
      item.classList.add('active');
    }
  });
}

// Handle browser back/forward navigation
export function setupBrowserNavigation(state) {
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1);
    if (hash && ['forms', 'builder', 'inbox', 'public'].includes(hash)) {
      state.currentView = hash;
      updateActiveView(state);
    }
  });
}
