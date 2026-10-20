/** Shared admin management screen for API-backed content and submissions. */
document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAuth.checkAuth()) return;

  const type = new URLSearchParams(window.location.search).get('type') || 'sermons';
  const definitions = {
    sermons: {
      title: 'Sermons', description: 'Create and maintain the sermon library.',
      endpoint: '/sermons', listPath: '/sermons/manage', navKey: 'sermons', columns: ['title', 'speaker', 'sermon_date', 'published', 'featured'],
      fields: [
        ['title', 'Title', 'text', true], ['speaker', 'Speaker', 'text', true],
        ['sermon_date', 'Date', 'date', true], ['scripture', 'Scripture', 'text'],
        ['category', 'Category', 'text'], ['tags', 'Tags (comma separated)', 'text'],
        ['description', 'Description', 'textarea'], ['thumbnail_url', 'Thumbnail URL', 'url'],
        ['video_url', 'Video URL', 'url'], ['audio_url', 'Audio URL', 'url'],
        ['published', 'Published', 'checkbox'], ['featured', 'Featured', 'checkbox'],
      ],
      items: (response) => response.data?.items || [],
    },
    events: {
      title: 'Events', description: 'Manage upcoming and past church events.',
      endpoint: '/events', listPath: '/events/manage', navKey: 'events', columns: ['title', 'event_date', 'start_time', 'end_time', 'location', 'published', 'featured'],
      fields: [
        ['title', 'Title', 'text', true], ['event_date', 'Date', 'date', true],
        ['start_time', 'Start time', 'time'], ['end_time', 'End time', 'time'], ['location', 'Location', 'text'],
        ['image_url', 'Image URL', 'url'], ['registration_url', 'Registration URL', 'url'],
        ['category', 'Category', 'select', true, [['convention', 'Convention'], ['revival', 'Revival'], ['camp_meeting', 'Camp Meeting'], ['anniversary', 'Anniversary'], ['other', 'Other']]],
        ['description', 'Description', 'textarea'], ['published', 'Published', 'checkbox'], ['featured', 'Featured', 'checkbox'],
      ],
      items: (response) => Array.isArray(response.data) ? response.data : [],
    },
    ministries: {
      title: 'Ministries', description: 'Manage ministry directory entries.',
      endpoint: '/ministries', listPath: '/ministries/manage', navKey: 'ministries', columns: ['name', 'slug', 'description', 'leader_name', 'published', 'featured'],
      fields: [
        ['name', 'Name', 'text', true], ['slug', 'URL slug', 'text', true],
        ['description', 'Description', 'textarea'], ['image_url', 'Image URL', 'url'],
        ['meeting_day', 'Meeting day', 'text'], ['meeting_time', 'Meeting time', 'text'],
        ['meeting_location', 'Meeting location', 'text'], ['leader_name', 'Ministry leader', 'text'],
        ['contact_phone', 'Ministry phone', 'text'], ['contact_email', 'Ministry email', 'email'],
        ['published', 'Published', 'checkbox'], ['featured', 'Featured', 'checkbox'],
      ],
      items: (response) => Array.isArray(response.data) ? response.data : [],
    },
    leadership: {
      title: 'Leadership', description: 'Manage leadership records using confirmed church information.',
      endpoint: '/leadership', listPath: '/leadership/manage', navKey: 'leadership',
      columns: ['name', 'position', 'bio', 'display_order', 'published'],
      fields: [
        ['name', 'Name', 'text', true], ['position', 'Position', 'text', true],
        ['bio', 'Biography', 'textarea'], ['photo_url', 'Photo URL', 'url'],
        ['display_order', 'Display order', 'number'], ['published', 'Published', 'checkbox'],
      ],
      items: (response) => Array.isArray(response.data) ? response.data : [],
    },
    giving: {
      title: 'Giving Records', description: 'Review payment records returned by the payment provider.',
      endpoint: '/giving/history', navKey: 'giving',
      columns: ['name', 'email', 'amount', 'currency', 'category', 'payment_status', 'payment_channel', 'payment_reference', 'created_at'],
      filterParam: 'category',
      filters: [['tithe', 'Tithe'], ['offering', 'Offering'], ['building_fund', 'Building Fund'], ['thanksgiving', 'Thanksgiving'], ['seed_offering', 'Seed Offering']],
      items: (response) => response.data?.items || [],
    },
    newsletter: {
      title: 'Newsletter Subscribers', description: 'View current newsletter subscribers.',
      endpoint: '/newsletter/subscribers', navKey: 'newsletter',
      columns: ['email', 'name', 'is_active', 'subscribed_at', 'unsubscribed_at'],
      items: (response) => response.data?.items || [],
    },
    messages: {
      title: 'Contact Messages', description: 'Review and archive visitor messages.',
      endpoint: '/contact', navKey: 'messages', columns: ['name', 'email', 'phone', 'subject', 'message', 'status', 'created_at'],
      statusEndpoint: (item) => `/contact/${item.id}/status`,
      statuses: [['unread', 'Unread'], ['read', 'Read'], ['archived', 'Archived']],
      items: (response) => response.data?.items || [],
    },
    prayers: {
      title: 'Prayer Requests', description: 'Review requests and update their prayer status.',
      endpoint: '/prayer-requests', navKey: 'prayer-requests', columns: ['name', 'request_text', 'is_private', 'status', 'created_at'],
      statusEndpoint: (item) => `/prayer-requests/${item.id}/status`,
      statuses: [['new', 'New'], ['being_prayed_for', 'Being Prayed For'], ['completed', 'Completed'], ['archived', 'Archived']],
      items: (response) => response.data?.items || [],
    },
    testimonies: {
      title: 'Testimonies', description: 'Submissions stay private until reviewed and explicitly approved for publication.',
      endpoint: '/testimonies', navKey: 'testimonies', columns: ['name', 'testimony', 'permission_to_publish', 'status', 'created_at'],
      statusEndpoint: (item) => `/testimonies/${item.id}/status`,
      statuses: [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['published', 'Published'], ['archived', 'Archived']],
      items: (response) => response.data?.items || [],
    },
    announcements: {
      title: 'Announcements', description: 'Publish timely church updates and set when they expire.',
      endpoint: '/announcements', listPath: '/announcements/manage', navKey: 'announcements',
      columns: ['title', 'priority', 'published', 'featured', 'expires_at'],
      fields: [
        ['title', 'Title', 'text', true], ['content', 'Content', 'textarea', true],
        ['image_url', 'Image URL', 'url'],
        ['priority', 'Priority', 'select', true, [['normal', 'Normal'], ['important', 'Important'], ['urgent', 'Urgent']]],
        ['expires_at', 'Expiry date', 'date'], ['published', 'Published', 'checkbox'], ['featured', 'Featured', 'checkbox'],
      ],
      items: (response) => response.data?.items || [],
    },
  };

  const config = definitions[type];
  if (!config) {
    window.location.replace('dashboard.html');
    return;
  }

  if (['giving', 'newsletter'].includes(type) && !['super_admin', 'admin'].includes(AdminAuth.getAdmin()?.role)) {
    window.location.replace('dashboard.html');
    return;
  }

  AdminAuth.initShell(config.navKey, config.title);
  document.title = `${config.title} | Admin — Royal Temple Worship Centre`;
  document.getElementById('content-title').textContent = config.title;
  document.getElementById('content-description').textContent = config.description;

  const rowsEl = document.getElementById('content-rows');
  const headEl = document.getElementById('content-head');
  const searchEl = document.getElementById('content-search');
  const loadingEl = document.getElementById('content-loading');
  const emptyEl = document.getElementById('content-empty');
  const addButton = document.getElementById('add-content');
  const editorPanel = document.getElementById('editor-panel');
  const form = document.getElementById('content-form');
  const fieldsEl = document.getElementById('content-fields');
  const successEl = document.getElementById('content-success');
  const errorEl = document.getElementById('content-error');
  const statusFilter = document.getElementById('status-filter');
  const statusHeader = config.statusEndpoint ? ['status'] : [];
  const allItemsHeader = [...new Set([...config.columns, ...statusHeader])];
  let records = [];
  let editingId = null;

  if (config.statuses || config.filters) {
    document.querySelector('.status-filter').classList.remove('hidden');
    const filterOptions = config.statuses
      ? [['', 'All statuses'], ...config.statuses]
      : [['', 'All categories'], ...config.filters];
    filterOptions.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      statusFilter.append(option);
    });
  }
  addButton.classList.toggle('hidden', !config.fields);

  function showMessage(element, text) {
    successEl.classList.remove('visible');
    errorEl.classList.remove('visible');
    element.textContent = text;
    element.classList.add('visible');
  }

  function formatValue(key, value) {
    if (key === 'permission_to_publish') return value ? 'Permission granted' : 'No publication permission';
    if (key === 'created_at' || key === 'sermon_date' || key === 'event_date') {
      if (!value) return '';
      const date = new Date(key === 'created_at' ? value : `${value}T00:00:00`);
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    }
    return value == null ? '' : String(value);
  }

  function renderRows() {
    const term = searchEl.value.trim().toLocaleLowerCase();
    const filtered = records.filter((record) =>
      Object.values(record).some((value) => String(value ?? '').toLocaleLowerCase().includes(term))
    );
    rowsEl.replaceChildren();
    filtered.forEach((record) => {
      const row = document.createElement('tr');
      allItemsHeader.forEach((key) => {
        const cell = document.createElement('td');
        if (key === 'status' && config.statusEndpoint) {
          const select = document.createElement('select');
          select.setAttribute('aria-label', `Status for ${record.name || record.title || 'record'}`);
          config.statuses.forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = record.status === value;
            select.append(option);
          });
          select.addEventListener('change', async () => {
            try {
              await AdminApi.patch(config.statusEndpoint(record), { status: select.value });
              record.status = select.value;
              showMessage(successEl, 'Status updated.');
            } catch (err) {
              showMessage(errorEl, err.message || 'Could not update status.');
              select.value = record.status;
            }
          });
          cell.append(select);
        } else {
          cell.className = key === 'message' || key === 'request_text' || key === 'testimony' || key === 'description' ? 'truncate' : '';
          cell.textContent = formatValue(key, record[key]);
          if (cell.classList.contains('truncate')) cell.title = cell.textContent;
        }
        row.append(cell);
      });

      if (config.fields) {
        const actions = document.createElement('td');
        actions.className = 'cell-actions';
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn btn-outline btn-sm';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => openEditor(record));
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteRecord(record));
        actions.append(editButton, deleteButton);
        row.append(actions);
      }
      rowsEl.append(row);
    });
    emptyEl.classList.toggle('hidden', filtered.length > 0);
  }

  function buildForm(record = {}) {
    fieldsEl.replaceChildren();
    config.fields.forEach(([name, label, kind, required, options]) => {
      const group = document.createElement('div');
      group.className = `form-group${kind === 'textarea' ? ' full' : ''}`;
      const labelEl = document.createElement('label');
      labelEl.htmlFor = `field-${name}`;
      labelEl.textContent = required ? `${label} *` : label;
      let input;
      if (kind === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
      } else if (kind === 'select') {
        input = document.createElement('select');
        options.forEach(([value, text]) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          input.append(option);
        });
      } else {
        input = document.createElement('input');
        input.type = kind;
      }
      input.id = `field-${name}`;
      input.name = name;
      input.required = Boolean(required);
      if (kind === 'checkbox') {
        input.checked = Boolean(record[name]);
      } else {
        input.value = record[name] == null ? (type === 'events' && name === 'category' ? 'other' : '') : String(record[name]);
        if (kind === 'date' && record[name]) input.value = String(record[name]).slice(0, 10);
      }
      if (type === 'events' && name === 'category' && record[name]) {
        input.value = String(record[name]).toLocaleLowerCase().replaceAll(' ', '_');
      }
      group.append(labelEl, input);
      fieldsEl.append(group);
    });
  }

  function openEditor(record = null) {
    editingId = record ? record.id : null;
    document.getElementById('editor-title').textContent = record ? 'Edit item' : 'Add item';
    buildForm(record || {});
    editorPanel.classList.remove('hidden');
    editorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteRecord(record) {
    const label = record.title || record.name || 'this item';
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;
    try {
      await AdminApi.delete(`${config.endpoint}/${record.id}`);
      records = records.filter((item) => item.id !== record.id);
      renderRows();
      showMessage(successEl, 'Item deleted.');
    } catch (err) {
      showMessage(errorEl, err.message || 'Could not delete item.');
    }
  }

  function renderTableHeader() {
    const row = document.createElement('tr');
    allItemsHeader.forEach((key) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = key.replaceAll('_', ' ');
      row.append(cell);
    });
    if (config.fields) {
      const actions = document.createElement('th');
      actions.scope = 'col';
      actions.textContent = 'Actions';
      row.append(actions);
    }
    headEl.replaceChildren(row);
  }

  async function loadRecords() {
    loadingEl.classList.remove('hidden');
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (statusFilter.value) params.set(config.statuses ? 'status' : config.filterParam, statusFilter.value);
      const response = await AdminApi.get(`${config.listPath || config.endpoint}?${params.toString()}`);
      records = config.items(response);
      renderRows();
    } catch (err) {
      showMessage(errorEl, err.message || 'Could not load records.');
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  renderTableHeader();
  searchEl.addEventListener('input', renderRows);
  statusFilter.addEventListener('change', loadRecords);
  addButton.addEventListener('click', () => openEditor());
  document.getElementById('cancel-edit').addEventListener('click', () => editorPanel.classList.add('hidden'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const payload = Object.fromEntries(new FormData(form).entries());
    config.fields.filter(([, , kind]) => kind === 'checkbox').forEach(([name]) => {
      payload[name] = form.elements.namedItem(name).checked;
    });
    if (type === 'events') {
      payload.category = payload.category || 'other';
    }
    try {
      if (editingId) {
        await AdminApi.put(`${config.endpoint}/${editingId}`, payload);
      } else {
        await AdminApi.post(config.endpoint, payload);
      }
      editorPanel.classList.add('hidden');
      showMessage(successEl, editingId ? 'Item updated.' : 'Item created.');
      await loadRecords();
    } catch (err) {
      showMessage(errorEl, err.message || 'Could not save item.');
    }
  });

  loadRecords();
});