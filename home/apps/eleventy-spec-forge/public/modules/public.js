// Public Module - Form publishing and public form rendering

export async function initPublicModule(state) {
  console.log('Initializing Public Module');
  
  // Check if we're on a public form page
  checkPublicFormRoute(state);
}

function checkPublicFormRoute(state) {
  const path = window.location.pathname;
  if (path.startsWith('/f/')) {
    const slug = path.split('/f/')[1];
    loadPublicForm(slug, state);
  }
}

export async function loadPublicForm(slug, state) {
  try {
    const response = await window.FormFoundry.apiFetch(`/api/public/forms/${slug}`);
    state.activeForm = response;
    renderPublicForm(response);
    
  } catch (err) {
    console.error('Error loading public form:', err);
    document.getElementById('public-content').innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Form Not Found</h3>
        <p>${err.message}</p>
        <p>Please check the URL and try again.</p>
      </div>
    `;
  }
}

function renderPublicForm(form) {
  const publicContent = document.getElementById('public-content');
  
  publicContent.innerHTML = `
    <div class="public-form-container">
      <div class="public-form-header">
        <h2>${form.name}</h2>
        <p>${form.description || 'Please fill out this form'}</p>
      </div>
      
      <form id="public-form" class="public-form">
        <div id="form-fields-container"></div>
        
        <div class="form-actions">
          <button type="submit" class="btn-primary">
            <i class="fas fa-paper-plane"></i> Submit
          </button>
          <button type="button" id="reset-form" class="btn-secondary">
            <i class="fas fa-undo"></i> Reset
          </button>
        </div>
        
        <div id="form-status" class="status"></div>
      </form>
    </div>
  `;
  
  // Render form fields
  renderPublicFormFields(form.schema, form.id);
  
  // Set up form submission
  setupPublicFormSubmission(form.id);
}

function renderPublicFormFields(schema, formId) {
  const fieldsContainer = document.getElementById('form-fields-container');
  
  if (!schema || !schema.sections) {
    fieldsContainer.innerHTML = '<p>This form has no fields.</p>';
    return;
  }
  
  fieldsContainer.innerHTML = schema.sections.map(section => `
    <div class="form-section">
      <h3 class="section-title">${section.title}</h3>
      <div class="section-fields">
        ${section.fields.map(field => renderPublicField(field)).join('')}
      </div>
    </div>
  `).join('');
}

function renderPublicField(field) {
  const fieldId = `field_${field.key}`;
  
  return `
    <div class="form-field" data-field-key="${field.key}">
      <label for="${fieldId}" class="field-label">
        ${field.label} ${field.required ? '<span class="required">*</span>' : ''}
      </label>
      ${renderFieldInput(field, fieldId)}
      ${field.helper_text ? `<p class="field-help">${field.helper_text}</p>` : ''}
      ${field.validation?.pattern ? `<p class="validation-note">Format: ${getValidationDescription(field)}</p>` : ''}
    </div>
  `;
}

function renderFieldInput(field, fieldId) {
  const attributes = [];
  if (field.required) attributes.push('required');
  if (field.placeholder) attributes.push(`placeholder="${field.placeholder}"`);
  if (field.validation?.minLength) attributes.push(`minlength="${field.validation.minLength}"`);
  if (field.validation?.maxLength) attributes.push(`maxlength="${field.validation.maxLength}"`);
  if (field.validation?.pattern) attributes.push(`pattern="${field.validation.pattern}"`);
  
  const attrsStr = attributes.join(' ');
  
  switch (field.type) {
    case 'textarea':
      return `<textarea id="${fieldId}" name="${field.key}" ${attrsStr} rows="4"></textarea>`;
    
    case 'select':
      return `
        <select id="${fieldId}" name="${field.key}" ${attrsStr}>
          <option value="">Select an option</option>
          ${field.options?.map(opt => 
            `<option value="${opt.value || opt}">${opt.label || opt}</option>`
          ).join('')}
        </select>
      `;
    
    case 'checkbox':
      return `
        <input type="checkbox" id="${fieldId}" name="${field.key}" value="true" ${attrsStr}>
        <label for="${fieldId}" class="checkbox-label">${field.label}</label>
      `;
    
    case 'radio':
      return field.options?.map(opt => `
        <div class="radio-option">
          <input type="radio" id="${fieldId}_${opt.value}" name="${field.key}" value="${opt.value || opt}" ${attrsStr}>
          <label for="${fieldId}_${opt.value}">${opt.label || opt}</label>
        </div>
      `).join('') || '';
    
    case 'email':
    case 'tel':
    case 'text':
    default:
      return `<input type="${field.type}" id="${fieldId}" name="${field.key}" ${attrsStr}>`;
  }
}

function getValidationDescription(field) {
  if (field.validation?.pattern) {
    if (field.type === 'email') return 'valid email address';
    if (field.validation.pattern.includes('phone')) return 'phone number';
    return 'specific format';
  }
  
  if (field.validation?.minLength || field.validation?.maxLength) {
    const min = field.validation?.minLength || 0;
    const max = field.validation?.maxLength || 'unlimited';
    return `${min}-${max} characters`;
  }
  
  return 'valid input';
}

function setupPublicFormSubmission(formId) {
  const form = document.getElementById('public-form');
  const statusElement = document.getElementById('form-status');
  const resetButton = document.getElementById('reset-form');
  
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!form.checkValidity()) {
        statusElement.textContent = 'Please fill in all required fields correctly.';
        statusElement.className = 'status error';
        return;
      }
      
      // Collect form data
      const formData = new FormData(form);
      const responseData = Object.fromEntries(formData.entries());
      
      // Submit to API
      const slug = window.location.pathname.split('/f/')[1];
      const response = await window.FormFoundry.apiFetch(`/api/public/forms/${slug}/submit`, {
        method: 'POST',
        body: JSON.stringify({ response: responseData })
      });
      
      // Show success message
      statusElement.textContent = 'Form submitted successfully! Thank you.';
      statusElement.className = 'status success';
      
      // Reset form
      form.reset();
      
    } catch (err) {
      console.error('Form submission error:', err);
      statusElement.textContent = err.message || 'Failed to submit form. Please try again.';
      statusElement.className = 'status error';
    }
  });
  
  // Reset button
  resetButton.addEventListener('click', () => {
    form.reset();
    statusElement.textContent = '';
  });
}

export function renderPublishInterface(form, state) {
  const publicPanel = document.getElementById('public-panel');
  
  if (form.public_slug) {
    const publicUrl = `${window.location.origin}/f/${form.public_slug}`;
    
    publicPanel.innerHTML = `
      <div class="publish-info">
        <h3><i class="fas fa-globe"></i> ${form.name} is Published</h3>
        
        <div class="public-url">
          <input type="text" value="${publicUrl}" id="public-url-input" readonly>
          <button id="copy-url" class="btn-secondary">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
        
        <div class="public-stats">
          <div class="stat-card">
            <strong id="public-response-count">-</strong>
            <span>Responses</span>
          </div>
          <div class="stat-card">
            <strong id="public-completion-rate">-</strong>
            <span>Completion Rate</span>
          </div>
          <div class="stat-card">
            <strong id="public-avg-time">-</strong>
            <span>Avg Time</span>
          </div>
        </div>
        
        <div class="public-actions">
          <button id="unpublish-form" class="btn-danger">
            <i class="fas fa-times"></i> Unpublish
          </button>
          <button id="preview-public-form" class="btn-primary">
            <i class="fas fa-eye"></i> Preview Form
          </button>
        </div>
      </div>
    `;
    
    // Set up event listeners
    document.getElementById('copy-url')?.addEventListener('click', () => {
      copyPublicUrl(publicUrl);
    });
    
    document.getElementById('unpublish-form')?.addEventListener('click', () => {
      unpublishForm(form.id, state);
    });
    
    document.getElementById('preview-public-form')?.addEventListener('click', () => {
      previewPublicForm(form.public_slug);
    });
    
    // Load public form stats
    loadPublicFormStats(form.id);
    
  } else {
    publicPanel.innerHTML = `
      <div class="publish-prompt">
        <h3><i class="fas fa-rocket"></i> Publish This Form</h3>
        <p>Make this form available to the public and start collecting responses.</p>
        
        <div class="publish-options">
          <div class="option-group">
            <label>
              <input type="checkbox" id="collect-emails" checked>
              Collect respondent emails
            </label>
          </div>
          
          <div class="option-group">
            <label>
              <input type="checkbox" id="require-login">
              Require login to submit
            </label>
          </div>
          
          <div class="option-group">
            <label>
              <input type="checkbox" id="enable-captcha">
              Enable CAPTCHA
            </label>
          </div>
        </div>
        
        <button id="publish-form-btn" class="btn-primary">
          <i class="fas fa-rocket"></i> Publish Form
        </button>
      </div>
    `;
    
    document.getElementById('publish-form-btn')?.addEventListener('click', () => {
      publishCurrentForm(form.id, state);
    });
  }
}

function copyPublicUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    window.FormFoundry.showSuccess('Public URL copied to clipboard!');
  });
}

async function unpublishForm(formId, state) {
  if (confirm('Are you sure you want to unpublish this form? Existing responses will be kept, but the public form will no longer be accessible.')) {
    try {
      // Note: The current API doesn't have an unpublish endpoint,
      // so we would need to add this to the backend
      await window.FormFoundry.apiFetch(`/api/forms/${formId}/unpublish`, {
        method: 'POST'
      });
      
      window.FormFoundry.showSuccess('Form unpublished successfully!');
      await loadForms(state); // Refresh forms list
      
    } catch (err) {
      console.error('Error unpublishing form:', err);
      window.FormFoundry.showError(err.message);
    }
  }
}

async function publishCurrentForm(formId, state) {
  try {
    const response = await window.FormFoundry.apiFetch(`/api/forms/${formId}/publish`, {
      method: 'POST',
      body: JSON.stringify({
        collectEmails: document.getElementById('collect-emails')?.checked,
        requireLogin: document.getElementById('require-login')?.checked,
        enableCaptcha: document.getElementById('enable-captcha')?.checked
      })
    });
    
    window.FormFoundry.showSuccess('Form published successfully!');
    await loadForms(state); // Refresh to get public slug
    
  } catch (err) {
    console.error('Error publishing form:', err);
    window.FormFoundry.showError(err.message);
  }
}

function previewPublicForm(slug) {
  window.open(`/f/${slug}`, '_blank');
}

async function loadPublicFormStats(formId) {
  try {
    const responses = await window.FormFoundry.apiFetch(`/api/forms/${formId}/responses`);
    
    // Calculate stats
    const total = responses.responses?.length || 0;
    const completed = responses.responses?.filter(r => r.status === 'completed').length || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Update UI
    document.getElementById('public-response-count')?.textContent = total;
    document.getElementById('public-completion-rate')?.textContent = `${completionRate}%`;
    document.getElementById('public-avg-time')?.textContent = 'N/A';
    
  } catch (err) {
    console.error('Error loading public form stats:', err);
  }
}
