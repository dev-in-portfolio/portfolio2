// Forms Module - Manage form list, creation, and organization

export async function initFormsModule(state) {
  console.log('Initializing Forms Module');
  
  // Set up event listeners
  setupFormsEventListeners(state);
  
  // Load initial forms data
  await loadForms(state);
}

function setupFormsEventListeners(state) {
  // Handle form creation
  document.getElementById('create-form')?.addEventListener('click', async () => {
    await createForm(state);
  });
  
  // Handle form search
  document.getElementById('search-forms')?.addEventListener('input', (e) => {
    filterForms(state, e.target.value);
  });
  
  // Handle form filtering
  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    filterFormsByStatus(state, e.target.value);
  });
}

export async function loadForms(state) {
  try {
    const data = await window.FormFoundry.apiFetch('/api/forms');
    state.forms = data.forms || [];
    renderFormsList(state);
    return state.forms;
  } catch (err) {
    console.error('Error loading forms:', err);
    window.FormFoundry.showError(err.message);
    return [];
  }
}

function renderFormsList(state) {
  const formsPanel = document.getElementById('forms-panel');
  if (!formsPanel) return;
  
  const searchQuery = document.getElementById('search-forms')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || 'all';
  
  // Filter forms
  let filteredForms = state.forms;
  if (searchQuery) {
    filteredForms = filteredForms.filter(form =>
      form.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  if (statusFilter !== 'all') {
    filteredForms = filteredForms.filter(form => form.status === statusFilter);
  }
  
  // Render forms grid
  const formsGrid = document.getElementById('forms-grid');
  if (formsGrid) {
    if (filteredForms.length === 0) {
      formsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No forms found</h3>
          <p>Create your first form to get started</p>
        </div>
      `;
    } else {
      formsGrid.innerHTML = filteredForms.map(form => `
        <div class="form-card" data-form-id="${form.id}">
          <div class="form-header">
            <h3>${form.name}</h3>
            <span class="status-badge ${form.status}">${form.status}</span>
          </div>
          <div class="form-meta">
            <p>${window.FormFoundry.truncateText(form.description || 'No description')}</p>
            <div class="form-actions">
              <button class="btn-edit" data-action="edit" data-id="${form.id}">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-builder" data-action="builder" data-id="${form.id}">
                <i class="fas fa-cog"></i> Builder
              </button>
              <button class="btn-inbox" data-action="inbox" data-id="${form.id}">
                <i class="fas fa-inbox"></i> Inbox
              </button>
              <button class="btn-publish" data-action="publish" data-id="${form.id}">
                <i class="fas fa-rocket"></i> ${form.public_slug ? 'Published' : 'Publish'}
              </button>
            </div>
          </div>
          <div class="form-footer">
            <span class="form-date">Updated: ${window.FormFoundry.formatDate(form.updated_at)}</span>
            ${form.public_slug ? `<span class="public-link">/f/${form.public_slug}</span>` : ''}
          </div>
        </div>
      `).join('');
      
      // Set up action buttons
      setupFormActionButtons(state);
    }
  }
}

function setupFormActionButtons(state) {
  document.querySelectorAll('.form-card button[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const formId = e.target.closest('button').dataset.id;
      const action = e.target.closest('button').dataset.action;
      const form = state.forms.find(f => f.id === formId);
      
      if (form) {
        switch (action) {
          case 'edit':
            await editForm(formId, state);
            break;
          case 'builder':
            await openBuilder(formId, state);
            break;
          case 'inbox':
            await openInbox(formId, state);
            break;
          case 'publish':
            await publishForm(formId, state);
            break;
        }
      }
    });
  });
}

async function createForm(state) {
  const nameInput = document.getElementById('form-name');
  const descriptionInput = document.getElementById('form-description');
  const statusElement = document.getElementById('form-status');
  
  if (!nameInput || !statusElement) return;
  
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  
  if (!name) {
    statusElement.textContent = 'Form name is required';
    statusElement.className = 'status error';
    return;
  }
  
  try {
    // Use sample schema for new forms
    const sampleSchema = getSampleSchema();
    
    const response = await window.FormFoundry.apiFetch('/api/forms', {
      method: 'POST',
      body: JSON.stringify({ name, description, schema: sampleSchema })
    });
    
    statusElement.textContent = 'Form created successfully!';
    statusElement.className = 'status success';
    
    // Clear inputs
    nameInput.value = '';
    descriptionInput.value = '';
    
    // Refresh forms list
    await loadForms(state);
    
  } catch (err) {
    statusElement.textContent = err.message;
    statusElement.className = 'status error';
  }
}

async function editForm(formId, state) {
  // This would typically open an edit modal or navigate to edit view
  console.log('Edit form:', formId);
  window.FormFoundry.showSuccess(`Editing form ${formId}`);
}

async function openBuilder(formId, state) {
  const form = state.forms.find(f => f.id === formId);
  if (form) {
    state.activeForm = form;
    state.currentView = 'builder';
    updateActiveView(state);
  }
}

async function openInbox(formId, state) {
  const form = state.forms.find(f => f.id === formId);
  if (form) {
    state.activeForm = form;
    state.currentView = 'inbox';
    
    // Load responses for this form
    await loadResponses(formId, state);
    updateActiveView(state);
  }
}

async function publishForm(formId, state) {
  try {
    const response = await window.FormFoundry.apiFetch(`/api/forms/${formId}/publish`, {
      method: 'POST'
    });
    
    window.FormFoundry.showSuccess('Form published successfully!');
    await loadForms(state); // Refresh to get public slug
    
  } catch (err) {
    window.FormFoundry.showError(err.message);
  }
}

function filterForms(state, searchQuery) {
  renderFormsList(state);
}

function filterFormsByStatus(state, status) {
  renderFormsList(state);
}

function getSampleSchema() {
  return {
    title: "Contact Form",
    description: "Basic contact information form",
    sections: [
      {
        title: "Contact Information",
        fields: [
          {
            key: "name",
            label: "Full Name",
            type: "text",
            required: true,
            placeholder: "Enter your name",
            validation: {
              minLength: 2,
              maxLength: 100
            }
          },
          {
            key: "email",
            label: "Email Address",
            type: "email",
            required: true,
            placeholder: "Enter your email",
            validation: {
              pattern: "^[^@]+@[^@]+\.[^@]+$"
            }
          },
          {
            key: "phone",
            label: "Phone Number",
            type: "tel",
            required: false,
            placeholder: "Enter your phone number"
          }
        ]
      },
      {
        title: "Message",
        fields: [
          {
            key: "subject",
            label: "Subject",
            type: "text",
            required: true,
            placeholder: "Brief subject"
          },
          {
            key: "message",
            label: "Message",
            type: "textarea",
            required: true,
            placeholder: "Enter your message here...",
            validation: {
              minLength: 10,
              maxLength: 2000
            }
          }
        ]
      }
    ]
  };
}

async function loadResponses(formId, state) {
  try {
    const data = await window.FormFoundry.apiFetch(`/api/forms/${formId}/responses`);
    state.responses = data.responses || [];
    return state.responses;
  } catch (err) {
    console.error('Error loading responses:', err);
    window.FormFoundry.showError(err.message);
    return [];
  }
}

// Helper function to update the active view
function updateActiveView(state) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  
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
