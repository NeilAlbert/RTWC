/**
 * =============================================================================
 * admin/js/pages/settings.js — edit site-wide text content.
 *
 * Loads all settings via GET /api/settings, renders one field per key, and on
 * "Save Changes" sends ONLY the changed fields via PUT /api/settings.
 * =============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAuth.checkAuth()) return;

  AdminAuth.initShell('settings', 'Settings'); // initShell wires the 401 handler

  const form = document.getElementById('settings-form');
  const saveBtn = document.getElementById('save-settings-btn');
  const resetBtn = document.getElementById('reset-settings-btn');
  const successAlert = document.getElementById('settings-success');
  const errorAlert = document.getElementById('settings-error');

  // Key → field metadata. Order defines the form layout.
  const FIELDS = [
    { key: 'welcome_message', label: 'Welcome Message', type: 'textarea', full: true },
    { key: 'hero_tagline', label: 'Hero Tagline', type: 'text', full: true },
    { key: 'service_times', label: 'Service Times', type: 'textarea', full: true },
    { key: 'church_address', label: 'Church Address', type: 'textarea', full: true },
    { key: 'phone_number', label: 'Phone Number', type: 'text' },
    { key: 'helpline_number', label: 'Helpline Number', type: 'text' },
    { key: 'email', label: 'Contact Email', type: 'email' },
    { key: 'mission_statement', label: 'Mission Statement', type: 'textarea', full: true },
    { key: 'vision_statement', label: 'Vision Statement', type: 'textarea', full: true },
  ];

  const originalValues = {}; // key → value as loaded from the API

  function showAlert(alertEl, message) {
    alertEl.textContent = message;
    alertEl.classList.add('visible');
  }

  function hideAlerts() {
    successAlert.classList.remove('visible');
    errorAlert.classList.remove('visible');
  }

  function buildForm() {
    const grid = document.getElementById('settings-fields');
    grid.innerHTML = '';

    FIELDS.forEach((field) => {
      const group = document.createElement('div');
      group.className = 'form-group' + (field.full ? ' full' : '');

      const label = document.createElement('label');
      label.setAttribute('for', `setting-${field.key}`);
      label.textContent = field.label;

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.id = `setting-${field.key}`;
        input.name = field.key;
        input.className = 'textarea-lg';
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.id = `setting-${field.key}`;
        input.name = field.key;
        input.type = field.type === 'email' ? 'email' : 'text';
      }

      group.appendChild(label);
      group.appendChild(input);
      grid.appendChild(group);
    });
  }

  async function loadSettings() {
    try {
      const res = await AdminApi.get('/settings');
      const settings = res.data || {};

      FIELDS.forEach((field) => {
        const el = document.getElementById(`setting-${field.key}`);
        const value = settings[field.key] !== undefined && settings[field.key] !== null
          ? settings[field.key]
          : '';
        el.value = value;
        originalValues[field.key] = value;
      });
    } catch (err) {
      showAlert(errorAlert, `Failed to load settings: ${err.message}`);
      saveBtn.disabled = true;
    }
  }

  // Restore every field to the values loaded from the server.
  // (A native type="reset" would clear fields to empty — those would then be
  // sent as blank values on save, wiping content. Re-populate explicitly.)
  function resetFields() {
    FIELDS.forEach((field) => {
      const el = document.getElementById(`setting-${field.key}`);
      el.value = originalValues[field.key] || '';
    });
    hideAlerts();
  }

  if (resetBtn) resetBtn.addEventListener('click', resetFields);

  // Collect only the fields whose value changed from the loaded originals.
  function collectChangedFields() {
    const changed = {};
    FIELDS.forEach((field) => {
      const el = document.getElementById(`setting-${field.key}`);
      if (el.value !== (originalValues[field.key] || '')) {
        changed[field.key] = el.value;
      }
    });
    return changed;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlerts();

    const changed = collectChangedFields();
    if (Object.keys(changed).length === 0) {
      showAlert(successAlert, 'No changes to save.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const res = await AdminApi.put('/settings', changed);
      // Update the baseline so subsequent saves only send new diffs.
      FIELDS.forEach((field) => {
        const el = document.getElementById(`setting-${field.key}`);
        if (res.data && res.data[field.key] !== undefined) {
          originalValues[field.key] = res.data[field.key];
          el.value = res.data[field.key];
        }
      });
      showAlert(successAlert, 'Settings saved successfully.');
    } catch (err) {
      showAlert(errorAlert, `Failed to save settings: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  buildForm();
  await loadSettings();
});
