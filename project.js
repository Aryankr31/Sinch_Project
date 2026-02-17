// Global state
let currentForm = null;
let selectedFieldIndex = null;
let forms = [];

// Initialize
function init() {
    loadForms();
    updateDashboard();
}

// Load forms from localStorage
function loadForms() {
    const saved = localStorage.getItem('formcraft_forms');
    if (saved) {
        forms = JSON.parse(saved);
        // Ensure all forms have submissions count
        forms.forEach(form => {
            if (!form.hasOwnProperty('submissions')) {
                form.submissions = Math.floor(Math.random() * 30 + 10);
            }
        });
    }
}

// Save forms to localStorage
function saveForms() {
    localStorage.setItem('formcraft_forms', JSON.stringify(forms));
    updateDashboard();
}

// Switch views
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const viewEl = document.getElementById(viewName);
    if (!viewEl) return;
    viewEl.classList.add('active');

    // Find the nav-item with an onclick that contains the viewName string
    const nav = Array.from(document.querySelectorAll('.nav-item')).find(n => {
        const attr = n.getAttribute('onclick') || '';
        return attr.indexOf(`'${viewName}'`) !== -1;
    });
    if (nav) nav.classList.add('active');

    if (viewName === 'preview') {
        renderPreview();
    } else if (viewName === 'dashboard') {
        updateDashboard();
    } else if (viewName === 'analytics') {
        renderAnalytics();
    }
}

// Create new form
function createNewForm() {
    currentForm = {
        id: 'form_' + Date.now(),
        name: 'Untitled Form',
        fields: [],
        createdAt: new Date().toISOString(),
        submissions: 0
    };
    selectedFieldIndex = null;
    const titleEl = document.getElementById('formTitle');
    if (titleEl) titleEl.textContent = currentForm.name;
    renderCanvas();
    const configPanel = document.getElementById('configPanel');
    if (configPanel) configPanel.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem 1rem;">Select a field to configure</p>';
    switchView('builder');
    showToast('New form created!');
}

// Edit existing form
function editForm(formId) {
    const form = forms.find(f => f.id === formId);
    if (!form) return;
    
    currentForm = JSON.parse(JSON.stringify(form)); // Deep copy
    selectedFieldIndex = null;
    const titleEl = document.getElementById('formTitle');
    if (titleEl) titleEl.textContent = currentForm.name;
    renderCanvas();
    const configPanel = document.getElementById('configPanel');
    if (configPanel) configPanel.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem 1rem;">Select a field to configure</p>';
    switchView('builder');
}

// Delete form
function deleteForm(formId) {
    if (confirm('Are you sure you want to delete this form?')) {
        forms = forms.filter(f => f.id !== formId);
        saveForms();
        showToast('Form deleted');
    }
}

// Generate submissions for a form
function generateSubmissions(formId) {
    const form = forms.find(f => f.id === formId);
    if (!form) return;
    
    // Add some random submissions
    const additionalSubs = Math.floor(Math.random() * 10 + 5);
    form.submissions = (form.submissions || 0) + additionalSubs;
    saveForms();
    showToast(`Added ${additionalSubs} test submissions`);
}

// Add field to form
function addField(type) {
    if (!currentForm) {
        showToast('Please create a form first');
        return;
    }

    const fieldNames = {
        'text': 'Text Input',
        'email': 'Email Address',
        'number': 'Number',
        'textarea': 'Text Area',
        'select': 'Dropdown',
        'radio': 'Radio Buttons',
        'checkbox': 'Checkboxes',
        'date': 'Date',
        'file': 'File Upload'
    };

    const field = {
        id: 'field_' + Date.now(),
        type: type,
        label: fieldNames[type] || 'Field',
        placeholder: type === 'file' ? 'Click to upload or drag and drop' : '',
        required: false,
        options: (type === 'select' || type === 'radio' || type === 'checkbox') ? ['Option 1', 'Option 2', 'Option 3'] : null,
        fileTypes: type === 'file' ? '.pdf,.doc,.docx,.jpg,.png' : null,
        maxFileSize: type === 'file' ? '5MB' : null
    };

    currentForm.fields.push(field);
    renderCanvas();
    selectField(currentForm.fields.length - 1);
    showToast('Field added!');
}

// Render canvas
function renderCanvas() {
    const canvas = document.getElementById('formCanvas');
    
    if (!canvas) return;

    if (!currentForm || currentForm.fields.length === 0) {
        canvas.innerHTML = `
            <div class="canvas-placeholder">
                <h3>👆 Click a field type to add it</h3>
                <p class="text-muted">Build your form by adding fields</p>
            </div>
        `;
        return;
    }

    canvas.innerHTML = currentForm.fields.map((field, index) => {
        let inputHTML = '';
        
        switch(field.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'date':
                inputHTML = `<input type="${field.type}" class="field-input" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
                break;
            case 'textarea':
                inputHTML = `<textarea class="field-textarea" rows="3" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
                break;
            case 'select':
                inputHTML = `<select class="field-select" ${field.required ? 'required' : ''}>
                    <option>Select...</option>
                    ${(field.options || []).map(opt => `<option>${opt}</option>`).join('')}
                </select>`;
                break;
            case 'radio':
                inputHTML = (field.options || []).map((opt, i) => 
                    `<div><input type="radio" name="${field.id}" id="${field.id}_${i}"> <label for="${field.id}_${i}">${opt}</label></div>`
                ).join('');
                break;
            case 'checkbox':
                inputHTML = (field.options || []).map((opt, i) => 
                    `<div><input type="checkbox" id="${field.id}_${i}"> <label for="${field.id}_${i}">${opt}</label></div>`
                ).join('');
                break;
            case 'file':
                inputHTML = `
                    <div class="file-upload-box">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📎</div>
                        <div style="font-weight: 500; margin-bottom: 0.25rem;">${field.placeholder || 'Click to upload or drag and drop'}</div>
                        <div class="text-muted" style="font-size: 0.85rem;">
                            ${field.fileTypes || 'All file types'} • Max ${field.maxFileSize || '5MB'}
                        </div>
                    </div>
                `;
                break;
        }

        return `
            <div class="form-field ${selectedFieldIndex === index ? 'selected' : ''}" onclick="selectField(${index})">
                <div class="field-header">
                    <div class="field-label">${field.label}${field.required ? ' *' : ''}</div>
                    <div class="field-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteField(${index})" title="Delete">🗑️</button>
                    </div>
                </div>
                ${inputHTML}
            </div>
        `;
    }).join('');
}

// Select field
function selectField(index) {
    selectedFieldIndex = index;
    renderCanvas();
    showConfiguration(index);
}

// Show configuration
function showConfiguration(index) {
    const field = currentForm.fields[index];
    const configPanel = document.getElementById('configPanel');
    
    if (!field || !configPanel) return;
    
    const hasOptions = field.type === 'select' || field.type === 'radio' || field.type === 'checkbox';
    const isFile = field.type === 'file';
    
    let html = `
        <div class="config-section">
            <label class="config-label">Label</label>
            <input type="text" class="config-input" value="${field.label}" 
                oninput="updateFieldProperty(${index}, 'label', this.value)">
        </div>
    `;

    if (!isFile && field.type !== 'radio' && field.type !== 'checkbox') {
        html += `
        <div class="config-section">
            <label class="config-label">Placeholder</label>
            <input type="text" class="config-input" value="${field.placeholder || ''}"
                oninput="updateFieldProperty(${index}, 'placeholder', this.value)">
        </div>`;
    }

    if (hasOptions) {
        html += `
        <div class="config-section">
            <label class="config-label">Options (one per line)</label>
            <textarea class="config-textarea" rows="4" 
                oninput="updateFieldOptions(${index}, this.value)">${(field.options || []).join('\n')}</textarea>
        </div>`;
    }

    if (isFile) {
        html += `
        <div class="config-section">
            <label class="config-label">Allowed File Types</label>
            <input type="text" class="config-input" value="${field.fileTypes || ''}" 
                placeholder=".pdf,.doc,.jpg,.png"
                oninput="updateFieldProperty(${index}, 'fileTypes', this.value)">
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 0.25rem;">
                Separate with commas (e.g., .pdf,.doc,.jpg)
            </div>
        </div>
        <div class="config-section">
            <label class="config-label">Max File Size</label>
            <input type="text" class="config-input" value="${field.maxFileSize || ''}" 
                placeholder="5MB"
                oninput="updateFieldProperty(${index}, 'maxFileSize', this.value)">
        </div>
        <div class="config-section">
            <label class="config-label">Upload Instructions</label>
            <input type="text" class="config-input" value="${field.placeholder || ''}" 
                placeholder="Click to upload or drag and drop"
                oninput="updateFieldProperty(${index}, 'placeholder', this.value)">
        </div>`;
    }

    html += `
        <div class="config-section">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" ${field.required ? 'checked' : ''}
                    onchange="updateFieldProperty(${index}, 'required', this.checked)">
                Required field
            </label>
        </div>
    `;
    
    configPanel.innerHTML = html;
}

// Update field property
function updateFieldProperty(index, property, value) {
    currentForm.fields[index][property] = value;
    renderCanvas();
}

// Update field options
function updateFieldOptions(index, value) {
    currentForm.fields[index].options = value.split('\n').filter(o => o.trim());
    renderCanvas();
}

// Delete field
function deleteField(index) {
    if (confirm('Delete this field?')) {
        currentForm.fields.splice(index, 1);
        selectedFieldIndex = null;
        renderCanvas();
        const configPanel = document.getElementById('configPanel');
        if (configPanel) configPanel.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem 1rem;">Select a field to configure</p>';
        showToast('Field deleted');
    }
}

// Save form
function saveForm() {
    if (!currentForm) {
        showToast('No form to save');
        return;
    }

    // Prompt for form name if it's still "Untitled Form"
    if (currentForm.name === 'Untitled Form') {
        const name = prompt('Enter form name:', currentForm.name);
        if (name && name.trim()) {
            currentForm.name = name.trim();
            const titleEl = document.getElementById('formTitle');
            if (titleEl) titleEl.textContent = currentForm.name;
        }
    }

    // Ensure submissions count exists
    if (!currentForm.hasOwnProperty('submissions')) {
        currentForm.submissions = Math.floor(Math.random() * 30 + 10);
    }

    const existingIndex = forms.findIndex(f => f.id === currentForm.id);
    if (existingIndex >= 0) {
        forms[existingIndex] = currentForm;
    } else {
        forms.push(currentForm);
    }
    saveForms();
    showToast('Form saved successfully!');
}

// Render preview
function renderPreview() {
    const container = document.getElementById('previewContainer');
    
    if (!container) return;

    if (!currentForm || currentForm.fields.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">Add fields to see preview</p>';
        return;
    }

    const fieldsHTML = currentForm.fields.map(field => {
        let inputHTML = '';
        
        switch(field.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'date':
                inputHTML = `<input type="${field.type}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
                break;
            case 'textarea':
                inputHTML = `<textarea rows="4" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
                break;
            case 'select':
                inputHTML = `<select ${field.required ? 'required' : ''}>
                    <option>Select...</option>
                    ${(field.options || []).map(opt => `<option>${opt}</option>`).join('')}
                </select>`;
                break;
            case 'radio':
                inputHTML = `<div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    ${(field.options || []).map((opt, i) => 
                        `<label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="radio" name="${field.id}"> ${opt}
                        </label>`
                    ).join('')}
                </div>`;
                break;
            case 'checkbox':
                inputHTML = `<div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${(field.options || []).map((opt, i) => 
                        `<label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox"> ${opt}
                        </label>`
                    ).join('')}
                </div>`;
                break;
            case 'file':
                inputHTML = `
                    <div class="file-upload-box">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📎</div>
                        <div style="font-weight: 500; margin-bottom: 0.25rem;">${field.placeholder || 'Click to upload or drag and drop'}</div>
                        <div class="text-muted" style="font-size: 0.85rem;">
                            ${field.fileTypes || 'All file types'} • Max ${field.maxFileSize || '5MB'}
                        </div>
                    </div>
                `;
                break;
        }

        return `
            <div class="preview-field">
                <label>${field.label}${field.required ? ' *' : ''}</label>
                ${inputHTML}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <h3 style="margin-bottom: 1.5rem;">${currentForm.name}</h3>
        ${fieldsHTML}
        <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="showToast('Form submitted! (Demo)')">
            Submit Form
        </button>
    `;
}

// Update dashboard
function updateDashboard() {
    // Calculate actual totals
    const totalFormsCount = forms.length;
    const totalFieldsCount = forms.reduce((sum, f) => sum + f.fields.length, 0);
    const totalSubmissionsCount = forms.reduce((sum, f) => sum + (f.submissions || 0), 0);
    
    // Update stats
    const totalFormsEl = document.getElementById('totalForms');
    const totalFieldsEl = document.getElementById('totalFields');
    const totalSubsEl = document.getElementById('totalSubmissions');
    if (totalFormsEl) totalFormsEl.textContent = totalFormsCount;
    if (totalFieldsEl) totalFieldsEl.textContent = totalFieldsCount;
    if (totalSubsEl) totalSubsEl.textContent = totalSubmissionsCount;

    // Render forms list
    const formList = document.getElementById('formList');
    if (!formList) return;

    if (forms.length === 0) {
        formList.innerHTML = `
            <div class="empty-state">
                <h3>No forms yet</h3>
                <p>Create your first form to get started</p>
            </div>
        `;
        return;
    }

    formList.innerHTML = forms.map(form => `
        <div class="form-list-item">
            <div class="form-list-info">
                <h3>${form.name}</h3>
                <div class="form-list-meta">
                    ${form.fields.length} fields • ${form.submissions || 0} submissions • Created ${new Date(form.createdAt).toLocaleDateString()}
                </div>
            </div>
            <div class="form-list-actions">
                <button class="btn btn-secondary" onclick="editForm('${form.id}')">✏️ Edit</button>
                <button class="btn btn-secondary" onclick="generateSubmissions('${form.id}')">➕ Add Subs</button>
                <button class="btn btn-danger" onclick="deleteForm('${form.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Render analytics (overall for all forms)
function renderAnalytics() {
    const analyticsContent = document.getElementById('analyticsContent');

    if (!analyticsContent) return;

    if (forms.length === 0) {
        analyticsContent.innerHTML = `
            <div class="empty-state">
                <h3>No forms created yet</h3>
                <p>Create some forms to see analytics</p>
            </div>
        `;
        return;
    }

    // Calculate overall metrics
    const totalSubmissions = forms.reduce((sum, f) => sum + (f.submissions || 0), 0);
    const avgSubmissionsPerForm = forms.length > 0 ? Math.round(totalSubmissions / forms.length) : 0;
    const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
    const avgFieldsPerForm = forms.length > 0 ? Math.round(totalFields / forms.length) : 0;

    // Generate form-wise breakdown
    const formBreakdown = forms.map(form => {
        const percentage = totalSubmissions > 0 ? Math.round((form.submissions / totalSubmissions) * 100) : 0;
        return {
            name: form.name,
            submissions: form.submissions || 0,
            percentage: percentage
        };
    }).sort((a, b) => b.submissions - a.submissions);

    const analyticsHTML = `
        <div class="analytics-grid">
            <div class="chart-card">
                <div class="chart-header">Total Submissions</div>
                <div style="text-align: center; padding: 1.5rem 0;">
                    <div class="stat-value">${totalSubmissions}</div>
                    <div class="text-muted" style="margin-top: 0.5rem;">across all forms</div>
                </div>
            </div>

            <div class="chart-card">
                <div class="chart-header">Average per Form</div>
                <div style="text-align: center; padding: 1.5rem 0;">
                    <div class="stat-value">${avgSubmissionsPerForm}</div>
                    <div class="text-muted" style="margin-top: 0.5rem;">submissions/form</div>
                </div>
            </div>

            <div class="chart-card">
                <div class="chart-header">Average Fields</div>
                <div style="text-align: center; padding: 1.5rem 0;">
                    <div class="stat-value">${avgFieldsPerForm}</div>
                    <div class="text-muted" style="margin-top: 0.5rem;">fields per form</div>
                </div>
            </div>
        </div>

        <div class="chart-card" style="margin-bottom: 2rem;">
            <div class="chart-header">Submissions by Form</div>
            ${formBreakdown.map(form => `
                <div class="chart-bar">
                    <div class="chart-bar-label">
                        <span>${form.name}</span>
                        <span>${form.submissions} (${form.percentage}%)</span>
                    </div>
                    <div class="chart-bar-fill">
                        <div class="chart-bar-inner" style="width: ${form.percentage}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="chart-card">
            <div class="chart-header">All Forms Overview</div>
            <div class="submissions-table">
                <table>
                    <thead>
                        <tr>
                            <th>Form Name</th>
                            <th>Fields</th>
                            <th>Submissions</th>
                            <th>Created</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${forms.map(form => `
                            <tr>
                                <td><strong>${form.name}</strong></td>
                                <td>${form.fields.length}</td>
                                <td>${form.submissions || 0}</td>
                                <td>${new Date(form.createdAt).toLocaleDateString()}</td>
                                <td><span class="badge">Active</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    analyticsContent.innerHTML = analyticsHTML;
}

// Show toast
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);