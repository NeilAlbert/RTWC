/**
 * admin/js/pages/leadership.js: list (all or one role), add, edit and delete leaders.
 */
import '../shell.js';
import { el } from '../components/dom.js';
import { api } from '../adminApi.js';
import { createCrudPage } from '../components/crudPage.js';
import { createField } from '../components/form.js';
import { createImageUpload } from '../components/imageUpload.js';

const ROLES = [
  { value: 'pastor', label: 'Pastor' },
  { value: 'pastors_wife', label: "Pastor's wife" },
  { value: 'presiding_elder', label: 'Presiding elder' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'elder', label: 'Elder' },
  { value: 'deacon', label: 'Deacon' },
  { value: 'deaconess', label: 'Deaconess' },
  { value: 'ministry_leader', label: 'Ministry leader' },
];
const roleLabel = Object.fromEntries(ROLES.map((role) => [role.value, role.label]));

// Loaded once for the ministry dropdown. The form opens only after a click, by
// which time this has normally arrived; a failed load leaves the list empty and
// the form says so.
let ministries = [];
let ministriesFailed = false;
async function loadMinistries() {
  const result = await api.get('/admin/ministries?limit=100');
  ministriesFailed = !result.ok;
  ministries = result.ok ? result.data.items : [];
}
const ministriesReady = loadMinistries();

function photo(row) {
  if (!row.photo_url) return el('span', { class: 'muted', text: 'None' });
  // Decorative: the name is in the next column.
  return el('img', { class: 'table-thumb', src: row.photo_url, alt: '', width: '48', height: '48', loading: 'lazy' });
}

function ministryHelp() {
  if (ministriesFailed) return 'The list of ministries could not be loaded. Close this form and try again.';
  if (ministries.length === 0) return 'There are no ministries yet. Add one on the Ministries page first.';
  return 'The ministry this person leads.';
}

createCrudPage({
  root: document.getElementById('page-root'),
  addButton: document.getElementById('page-action'),
  endpoint: '/admin/leadership',
  noun: 'leader',
  nameOf: (row) => row.name,
  caption: 'Leaders, in display order',
  filters: [{ name: 'role', label: 'Role', value: '', options: [{ value: '', label: 'All roles' }, ...ROLES] }],
  emptyText: (state) => (state.role ? 'There are no leaders with this role.' : 'No leaders have been added yet.'),
  columns: [
    { label: 'Photo', render: photo },
    { key: 'name', label: 'Name', rowHeader: true, wrap: true },
    { label: 'Role', render: (row) => roleLabel[row.role] || row.role },
    { label: 'Ministry', render: (row) => row.ministry_name || '' },
    { key: 'display_order', label: 'Order', numeric: true },
  ],
  fields: (row) => [
    { name: 'name', label: 'Name', required: true, maxLength: 150, value: row ? row.name : '', requiredMessage: 'Enter a name.' },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      requiredMessage: 'Choose a role.',
      options: [{ value: '', label: 'Choose a role' }, ...ROLES],
      value: row ? row.role : '',
    },
    createField({
      name: 'ministry_id',
      label: 'Ministry',
      type: 'select',
      hideOptional: true,
      help: ministryHelp(),
      options: [{ value: '', label: 'Choose a ministry' }, ...ministries.map((ministry) => ({ value: String(ministry.id), label: ministry.name }))],
      value: row && row.ministry_id ? String(row.ministry_id) : '',
      validate: (value, values) => (values.role === 'ministry_leader' && !value ? 'Choose the ministry this person leads.' : ''),
    }),
    createImageUpload({ name: 'photo_url', label: 'Photo', value: row ? row.photo_url : '' }),
    { name: 'bio', label: 'Bio', type: 'textarea', maxLength: 5000, value: row ? row.bio : '' },
    {
      name: 'display_order',
      label: 'Display order',
      type: 'number',
      min: 0,
      max: 9999,
      value: row ? row.display_order : 0,
      help: 'Lower numbers appear first. Leaders with the same number are shown by name.',
      validate: (value) => (value === '' || (/^\d{1,4}$/.test(value)) ? '' : 'Enter a whole number from 0 to 9999.'),
    },
  ],
  onFormReady(form) {
    const role = form.fields.find((field) => field.name === 'role').input;
    const ministry = form.fields.find((field) => field.name === 'ministry_id');
    // The ministry is asked for only when the role is Ministry leader.
    function showMinistry() {
      const needed = role.value === 'ministry_leader';
      ministry.element.hidden = !needed;
      ministry.input.required = needed;
    }
    role.addEventListener('change', showMinistry);
    showMinistry();
  },
  toBody: (values) => ({
    ...values,
    ministry_id: values.role === 'ministry_leader' ? Number(values.ministry_id) : null,
    display_order: values.display_order === '' ? 0 : Number(values.display_order),
  }),
  // A new ministry leader changes nothing here, but keep the dropdown fresh after any change.
  onChange: loadMinistries,
});

// If the first load of ministries failed, try once more when the page is used.
ministriesReady.then(() => {
  if (ministriesFailed) document.getElementById('page-action').addEventListener('click', loadMinistries, { once: true });
});
