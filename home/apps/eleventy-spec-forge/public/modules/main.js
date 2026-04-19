// Main Application Module - FormFoundry
// Handles overall application state and routing

import { initFormsModule } from './forms.js';
import { initBuilderModule } from './builder.js';
import { initInboxModule } from './inbox.js';
import { initPublicModule } from './public.js';
import { initNavigation, setupBrowserNavigation } from './navigation.js';
import { initSession, initTheme } from './session.js';

// Global state
const state = {
  forms: [],
  activeForm: null,
  activeSchema: null,
  responses: [],
  currentView: 'forms',
  userPreferences: {}
};

// Initialize all modules
async function initializeApp() {
  try {
    // Initialize session and user preferences
    await initSession(state);
    
    // Set up navigation
    initNavigation(state);
    
    // Initialize all feature modules
    await initFormsModule(state);
    await initBuilderModule(state);
    await initInboxModule(state);
    await initPublicModule(state);
    
    // Load initial data
    await loadInitialData();
    
    console.log('FormFoundry initialized successfully');
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize application. Please refresh.');
  }
}

async function loadInitialData() {
  try {
    await loadForms();
    updateActiveView();
  } catch (error) {
    console.error('Error loading initial data:', error);
    showError('Could not load form data. Check your connection.');
  }
}

// Global error handling
function showError(message) {
  const errorElement = document.getElementById('global-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  } else {
    alert(message);
  }
}

// Global success handling
function showSuccess(message) {
  const successElement = document.getElementById('global-success');
  if (successElement) {
    successElement.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => {
      successElement.style.display = 'none';
    }, 3000);
  }
}

// API utilities
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Key': getDeviceKey(),
      ...(options.headers || {})
    }
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Request failed');
  }
  
  return res.json();
}

function getDeviceKey() {
  let key = localStorage.getItem('formfoundry_device_key');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('formfoundry_device_key', key);
  }
  return key;
}

// Utility functions
function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function truncateText(text, maxLength = 50) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Expose global state and utilities
window.FormFoundry = {
  state,
  showError,
  showSuccess,
  apiFetch,
  getDeviceKey,
  formatDate,
  truncateText
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { state, initializeApp };
}
