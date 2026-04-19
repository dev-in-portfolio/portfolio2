// Builder Module - Advanced form schema editing with field management

export async function initBuilderModule(state) {
  console.log('Initializing Builder Module');
  
  // Set up event listeners for builder interface
  setupBuilderEventListeners(state);
}

function setupBuilderEventListeners(state) {
  // This will be set up when a form is selected for editing
}

export async function loadFormForEditing(formId, state) {
  try {
    const response = await window.FormFoundry.apiFetch(`/api/forms/${formId}`);
    state.activeForm = response;
    renderBuilderInterface(state);
    
  } catch (err) {
    console.error('Error loading form for editing:', err);
    window.FormFoundry.showError(err.message);
  }
}

function renderBuilderInterface(state) {
  if (!state.activeForm) {
    document.getElementById('builder-content').innerHTML = 
      '<p class="status">Select a form to edit its schema</p>';
    return;
  }
  
  const form = state.activeForm;
  const builderContent = document.getElementById('builder-content');
  
  builderContent.innerHTML = `
    <div class="builder-header">
      <h3>${form.name}</h3>
      <div class="builder-actions">
        <button id="save-form" class="btn-primary">
          <i class="fas fa-save"></i> Save
        </button>
        <button id="preview-form" class="btn-secondary">
          <i class="fas fa-eye"></i> Preview
        </button>
        <button id="add-section" class="btn-secondary">
          <i class="fas fa-plus"></i> Add Section
        </button>
      </div>
    </div>
    
    <div class="form-meta">
      <label>Form Description</label>
      <input type="text" id="form-description" value="${form.description || ''}" placeholder="Describe this form...">
    </div>
    
    <div id="schema-editor" class="schema-editor"></div>
  `;
  
  // Render the schema editor
  renderSchemaEditor(form.schema || getDefaultSchema(), state);
  
  // Set up event listeners
  document.getElementById('save-form').addEventListener('click', () => saveForm(state));
  document.getElementById('preview-form').addEventListener('click', () => previewForm(state));
  document.getElementById('add-section').addEventListener('click', () => addSection(state));
}

function renderSchemaEditor(schema, state) {
  const editorContainer = document.getElementById('schema-editor');
  
  editorContainer.innerHTML = `
    <div class="schema-sections">
      ${schema.sections.map((section, sectionIndex) => `
        <div class="schema-section" data-section-index="${sectionIndex}">
          <div class="section-header">
            <h4>${section.title}</h4>
            <div class="section-actions">
              <button class="btn-add-field" data-section-index="${sectionIndex}">
                <i class="fas fa-plus"></i> Add Field
              </button>
              <button class="btn-delete-section" data-section-index="${sectionIndex}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div class="section-fields">
            ${section.fields.map((field, fieldIndex) => renderFieldEditor(field, sectionIndex, fieldIndex)).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  // Set up field action buttons
  setupFieldActions(state);
}

function renderFieldEditor(field, sectionIndex, fieldIndex) {
  return `
    <div class="field-editor" data-section-index="${sectionIndex}" data-field-index="${fieldIndex}">
      <div class="field-header">
        <div class="field-info">
          <strong>${field.label}</strong> (${field.key})
          <span class="field-type">${field.type}</span>
          ${field.required ? '<span class="required-badge">Required</span>' : ''}
        </div>
        <div class="field-actions">
          <button class="btn-edit-field" data-section-index="${sectionIndex}" data-field-index="${fieldIndex}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-delete-field" data-section-index="${sectionIndex}" data-field-index="${fieldIndex}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <div class="field-preview">
        <label>${field.label}</label>
        ${renderFieldPreview(field)}
        ${field.helper_text ? `<p class="helper-text">${field.helper_text}</p>` : ''}
      </div>
    </div>
  `;
}

function renderFieldPreview(field) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
      return `<input type="${field.type}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
    case 'textarea':
      return `<textarea placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
    case 'select':
      return `<select ${field.required ? 'required' : ''}>
        <option value="">Select an option</option>
        ${field.options?.map(opt => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join('')}
      </select>`;
    case 'checkbox':
      return `<input type="checkbox" ${field.required ? 'required' : ''}> ${field.label}`;
    case 'radio':
      return field.options?.map(opt => 
        `<div><input type="radio" name="${field.key}" value="${opt.value || opt}" ${field.required ? 'required' : ''}> ${opt.label || opt}</div>`
      ).join('') || '';
    default:
      return `<input type="text" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
  }
}

function setupFieldActions(state) {
  // Add field buttons
  document.querySelectorAll('.btn-add-field').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionIndex = parseInt(e.target.dataset.sectionIndex);
      addFieldToSection(sectionIndex, state);
    });
  });
  
  // Edit field buttons
  document.querySelectorAll('.btn-edit-field').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionIndex = parseInt(e.target.dataset.sectionIndex);
      const fieldIndex = parseInt(e.target.dataset.fieldIndex);
      editField(sectionIndex, fieldIndex, state);
    });
  });
  
  // Delete field buttons
  document.querySelectorAll('.btn-delete-field').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionIndex = parseInt(e.target.dataset.sectionIndex);
      const fieldIndex = parseInt(e.target.dataset.fieldIndex);
      deleteField(sectionIndex, fieldIndex, state);
    });
  });
  
  // Delete section buttons
  document.querySelectorAll('.btn-delete-section').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionIndex = parseInt(e.target.dataset.sectionIndex);
      deleteSection(sectionIndex, state);
    });
  });
}

function addSection(state) {
  const newSection = {
    title: `New Section ${state.activeForm.schema.sections.length + 1}`,
    description: '',
    fields: []
  };
  
  state.activeForm.schema.sections.push(newSection);
  renderSchemaEditor(state.activeForm.schema, state);
  window.FormFoundry.showSuccess('Section added!');
}

function addFieldToSection(sectionIndex, state) {
  const newField = getDefaultField();
  state.activeForm.schema.sections[sectionIndex].fields.push(newField);
  renderSchemaEditor(state.activeForm.schema, state);
  window.FormFoundry.showSuccess('Field added!');
}

function editField(sectionIndex, fieldIndex, state) {
  const field = state.activeForm.schema.sections[sectionIndex].fields[fieldIndex];
  showFieldEditorModal(field, sectionIndex, fieldIndex, state);
}

function deleteField(sectionIndex, fieldIndex, state) {
  if (confirm('Are you sure you want to delete this field?')) {
    state.activeForm.schema.sections[sectionIndex].fields.splice(fieldIndex, 1);
    renderSchemaEditor(state.activeForm.schema, state);
    window.FormFoundry.showSuccess('Field deleted!');
  }
}

function deleteSection(sectionIndex, state) {
  if (state.activeForm.schema.sections.length <= 1) {
    window.FormFoundry.showError('You must have at least one section');
    return;
  }
  
  if (confirm('Are you sure you want to delete this section and all its fields?')) {
    state.activeForm.schema.sections.splice(sectionIndex, 1);
    renderSchemaEditor(state.activeForm.schema, state);
    window.FormFoundry.showSuccess('Section deleted!');
  }
}

function showFieldEditorModal(field, sectionIndex, fieldIndex, state) {
  // In a real implementation, this would show a modal with detailed field editing
  const newLabel = prompt('Edit field label:', field.label);
  if (newLabel) {
    state.activeForm.schema.sections[sectionIndex].fields[fieldIndex].label = newLabel;
    renderSchemaEditor(state.activeForm.schema, state);
  }
}

async function saveForm(state) {
  try {
    const formName = document.getElementById('form-description').value;
    
    const response = await window.FormFoundry.apiFetch(`/api/forms/${state.activeForm.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: state.activeForm.name,
        description: formName,
        schema: state.activeForm.schema
      })
    });
    
    window.FormFoundry.showSuccess('Form saved successfully!');
    await loadForms(state); // Refresh forms list
    
  } catch (err) {
    console.error('Error saving form:', err);
    window.FormFoundry.showError(err.message);
  }
}

function previewForm(state) {
  // Show a preview of how the form will look
  alert('Preview functionality would show the rendered form here');
}

function getDefaultSchema() {
  return {
    title: 'Untitled Form',
    sections: [
      {
        title: 'Main Section',
        fields: []
      }
    ]
  };
}

function getDefaultField() {
  return {
    key: `field_${Date.now()}`,
    label: 'New Field',
    type: 'text',
    required: false,
    placeholder: 'Enter text...',
    helper_text: '',
    validation: {}
  };
}
