/* Settings page: the church details and live stream links shown on the public site.
   Loads every setting with GET /api/settings and saves only the fields that changed
   with PUT /api/settings. */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAuth.checkAuth()) return;

  AdminAuth.initShell('settings', 'Settings');

  const form = document.getElementById('settings-form');
  const saveBtn = document.getElementById('save-settings-btn');
  const resetBtn = document.getElementById('reset-settings-btn');
  const successAlert = document.getElementById('settings-success');
  const errorAlert = document.getElementById('settings-error');

  // The order here is the order on the page. `hint` says where the value appears.
  const FIELDS = [
    { key: 'welcome_message', label: 'Welcome message', type: 'textarea', hint: 'First paragraph of the home page.' },
    { key: 'service_times', label: 'Service times', type: 'textarea', hint: 'One service per line, for example "Sunday worship service: 8:00 am to 11:30 am".' },
    { key: 'church_address', label: 'Church address', type: 'textarea' },
    { key: 'phone_number', label: 'Phone number', type: 'text' },
    { key: 'helpline_number', label: 'Helpline number', type: 'text', hint: 'Shown on the Contact page.' },
    { key: 'email', label: 'Contact email', type: 'email' },
    { key: 'mission_statement', label: 'Mission statement', type: 'textarea', hint: 'Shown on the About page.' },
    { key: 'vision_statement', label: 'Vision statement', type: 'textarea', hint: 'Shown on the About page.' },
    { key: 'youtube_channel_url', label: 'YouTube channel link', type: 'url' },
    { key: 'youtube_live_video_id', label: 'YouTube live video ID', type: 'text', hint: 'The 11 characters after "v=" in the video link.' },
    { key: 'facebook_live_url', label: 'Facebook page or live link', type: 'url' },
    { key: 'preferred_default_platform', label: 'Show first when live on both', type: 'select', options: [['youtube', 'YouTube'], ['facebook', 'Facebook']] },
    { key: 'live_status_override', label: 'Live status', type: 'select', options: [['', 'Check automatically'], ['live', 'Always show as live'], ['offline', 'Always show as not live']] },
    { key: 'next_service_title', label: 'Next broadcast: name', type: 'text' },
    { key: 'next_service_date', label: 'Next broadcast: date', type: 'date' },
    { key: 'next_service_time', label: 'Next broadcast: time', type: 'text', hint: 'For example "8:00 am".' },
    { key: 'previous_broadcast_url', label: 'Link to a recent service', type: 'url' },
  ];

  const originalValues = {};

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

    FIELDS.forEach((field) => {
      const group = document.createElement('div');
      group.className = field.type === 'textarea' ? 'form-group full' : 'form-group';

      const label = document.createElement('label');
      label.setAttribute('for', `setting-${field.key}`);
      label.textContent = field.label;

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else if (field.type === 'select') {
        input = document.createElement('select');
        field.options.forEach(([value, text]) => input.add(new Option(text, value)));
      } else {
        input = document.createElement('input');
        input.type = field.type;
      }
      input.id = `setting-${field.key}`;
      input.name = field.key;

      group.append(label, input);

      if (field.hint) {
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.id = `hint-${field.key}`;
        hint.textContent = field.hint;
        input.setAttribute('aria-describedby', hint.id);
        group.append(hint);
      }
      grid.append(group);
    });
  }

  async function loadSettings() {
    try {
      const res = await AdminApi.get('/settings');
      const settings = res.data || {};

      FIELDS.forEach((field) => {
        const value = settings[field.key] ?? '';
        document.getElementById(`setting-${field.key}`).value = value;
        originalValues[field.key] = value;
      });
    } catch (err) {
      showAlert(errorAlert, `The settings could not be loaded. ${err.message}`);
      saveBtn.disabled = true;
    }
  }

  // A native reset button would empty every field, and the empty values would then
  // be saved over the real ones. Put back what was loaded instead.
  resetBtn.addEventListener('click', () => {
    FIELDS.forEach((field) => {
      document.getElementById(`setting-${field.key}`).value = originalValues[field.key] || '';
    });
    hideAlerts();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlerts();

    const changed = {};
    FIELDS.forEach((field) => {
      const value = document.getElementById(`setting-${field.key}`).value;
      if (value !== (originalValues[field.key] || '')) changed[field.key] = value;
    });

    if (Object.keys(changed).length === 0) {
      showAlert(successAlert, 'Nothing has changed, so nothing was saved.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving';

    try {
      const res = await AdminApi.put('/settings', changed);
      FIELDS.forEach((field) => {
        if (res.data && res.data[field.key] !== undefined) {
          originalValues[field.key] = res.data[field.key];
          document.getElementById(`setting-${field.key}`).value = res.data[field.key];
        }
      });
      showAlert(successAlert, 'Your changes have been saved.');
    } catch (err) {
      showAlert(errorAlert, `Your changes could not be saved. ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  });

  buildForm();
  await loadSettings();
});
