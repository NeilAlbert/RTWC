/* Admin > Leadership: list (optionally one role), add, edit and delete leaders. */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('leadership', 'Leadership');

  const { el, crudPage } = window.AdminUI;
  const roleSelect = document.getElementById('leader-role-filter');

  const ROLES = [
    ['pastor', 'Pastor'],
    ['pastors_wife', "Pastor's wife"],
    ['presiding_elder', 'Presiding Elder'],
    ['secretary', 'Secretary'],
    ['elder', 'Elder'],
    ['deacon', 'Deacon'],
    ['deaconess', 'Deaconess'],
    ['ministry_leader', 'Ministry Leader'],
  ];
  const roleName = Object.fromEntries(ROLES);
  ROLES.forEach(([value, text]) => roleSelect.add(new Option(text, value)));

  // The ministry dropdown in the form. If the ministries cannot be loaded the page
  // still works; saving a ministry leader will then ask for a ministry.
  let ministryOptions = [['', 'Choose a ministry']];
  try {
    const response = await AdminApi.get('/ministries');
    ministryOptions = ministryOptions.concat(response.data.map((ministry) => [String(ministry.id), ministry.name]));
  } catch (err) {
    document.getElementById('page-alert').textContent = 'The list of ministries could not be loaded, so a ministry leader cannot be saved right now. Reload the page to try again.';
    document.getElementById('page-alert').classList.add('visible');
  }

  const list = crudPage({
    noun: 'leader',
    tableLabel: 'Leaders',
    tableHost: document.getElementById('leader-table'),
    alertHost: document.getElementById('page-alert'),
    addButton: document.getElementById('add-leader'),
    nameOf: (row) => row.name,
    columns: [
      {
        label: 'Photo',
        render: (row) => (row.photo_url
          ? el('img', { class: 'table-thumb', src: row.photo_url, alt: '', width: '48', height: '48', loading: 'lazy' })
          : el('span', { class: 'table-thumb table-thumb-empty', text: 'None' })),
      },
      { label: 'Name', render: (row) => row.name },
      { label: 'Role', render: (row) => roleName[row.role] || row.role },
      { label: 'Ministry', render: (row) => row.ministry_name || '' },
      { label: 'Order', numeric: true, render: (row) => String(row.display_order) },
    ],
    load: async () => {
      const params = new URLSearchParams();
      if (roleSelect.value) params.set('role', roleSelect.value);
      const response = await AdminApi.get(`/admin/leadership?${params}`);
      return { items: response.data.items, pagination: null };
    },
    emptyText: () => (roleSelect.value
      ? `No leaders with the role ${roleName[roleSelect.value]} have been added.`
      : 'No leaders have been added yet.'),
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, requiredMessage: 'Enter a name.', maxLength: 150 },
      { name: 'role', label: 'Role', type: 'select', options: ROLES, required: true, requiredMessage: 'Choose a role.' },
      {
        name: 'ministry_id',
        label: 'Ministry',
        type: 'select',
        options: ministryOptions,
        required: true,
        requiredMessage: 'Choose the ministry this person leads.',
      },
      { name: 'photo_url', label: 'Photo', type: 'image', hint: 'JPEG, PNG or WebP, 5 MB at most.' },
      { name: 'bio', label: 'Bio', type: 'textarea', maxLength: 5000 },
      {
        name: 'display_order',
        label: 'Display order',
        type: 'number',
        hint: 'A lower number appears first. Leaders with the same number are listed by name.',
        validate: (value) => (value !== '' && !/^\d{1,4}$/.test(value) ? 'Enter a whole number from 0 to 9999.' : ''),
      },
    ],
    toForm: (row) => ({
      name: row ? row.name : '',
      role: row ? row.role : 'elder',
      ministry_id: row && row.ministry_id ? String(row.ministry_id) : '',
      photo_url: row ? row.photo_url : '',
      bio: row ? row.bio : '',
      display_order: row ? String(row.display_order) : '0',
    }),
    save: (values, row) => {
      const payload = {
        name: values.name,
        role: values.role,
        ministry_id: values.role === 'ministry_leader' ? Number(values.ministry_id) : null,
        photo_url: values.photo_url,
        bio: values.bio,
        display_order: values.display_order === '' ? 0 : Number(values.display_order),
      };
      return row ? AdminApi.put(`/leadership/${row.id}`, payload) : AdminApi.post('/leadership', payload);
    },
    remove: (row) => AdminApi.delete(`/leadership/${row.id}`),
    // The ministry field is shown, and required, only for a ministry leader.
    onFormOpen: (form) => {
      const role = form.input('role');
      const sync = () => form.setFieldVisible('ministry_id', role.value === 'ministry_leader');
      role.addEventListener('change', sync);
      sync();
    },
  });

  roleSelect.addEventListener('change', () => list.reload());
});
