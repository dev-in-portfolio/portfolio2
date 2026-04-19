// Session Module - User session management and preferences

export async function initSession(state) {
  console.log('Initializing Session Module');
  
  // Load user preferences
  loadUserPreferences(state);
  
  // Set up session monitoring
  setupSessionMonitoring();
}

function loadUserPreferences(state) {
  try {
    const preferences = localStorage.getItem('formfoundry_preferences');
    if (preferences) {
      state.userPreferences = JSON.parse(preferences);
      console.log('Loaded user preferences:', state.userPreferences);
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

function saveUserPreferences(state) {
  try {
    localStorage.setItem('formfoundry_preferences', JSON.stringify(state.userPreferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

function setupSessionMonitoring() {
  // Track user activity for session management
  let lastActivity = Date.now();
  
  // Update last activity on user interactions
  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
  activityEvents.forEach(event => {
    window.addEventListener(event, () => {
      lastActivity = Date.now();
    });
  });
  
  // Check for inactivity periodically
  setInterval(() => {
    const now = Date.now();
    const inactiveTime = now - lastActivity;
    
    // 30 minutes of inactivity
    if (inactiveTime > 30 * 60 * 1000) {
      console.log('User session expired due to inactivity');
      // Could trigger re-authentication or session refresh
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

export function setPreference(key, value, state) {
  state.userPreferences[key] = value;
  saveUserPreferences(state);
}

export function getPreference(key, state, defaultValue = null) {
  return state.userPreferences[key] !== undefined 
    ? state.userPreferences[key] 
    : defaultValue;
}

export function clearSession() {
  localStorage.removeItem('formfoundry_preferences');
  localStorage.removeItem('formfoundry_device_key');
  window.location.reload();
}

// Theme management
export function initTheme() {
  const savedTheme = localStorage.getItem('formfoundry_theme') || 'light';
  document.body.classList.add(savedTheme === 'dark' ? 'dark-theme' : 'light-theme');
}

export function toggleTheme() {
  const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  // Remove current theme
  document.body.classList.remove(`${currentTheme}-theme`);
  
  // Add new theme
  document.body.classList.add(`${newTheme}-theme`);
  
  // Save preference
  localStorage.setItem('formfoundry_theme', newTheme);
}

// Device key management (moved from main.js for modularity)
export function getDeviceKey() {
  let key = localStorage.getItem('formfoundry_device_key');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('formfoundry_device_key', key);
  }
  return key;
}

export function regenerateDeviceKey() {
  const newKey = crypto.randomUUID();
  localStorage.setItem('formfoundry_device_key', newKey);
  return newKey;
}
