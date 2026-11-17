/**
 * admin/js/pages/account.js: the admin's name and email, and the password change.
 */
import '../shell.js';
import { el } from '../components/dom.js';
import { api } from '../adminApi.js';
import { showLoading, showError } from '../components/states.js';
import { createForm } from '../components/form.js';
import { toast } from '../components/toast.js';

const MIN_LENGTH = 12;
// bcrypt, which stores the password, reads only its first 72 bytes.
const MAX_BYTES = 72;

const detailsBox = document.getElementById('account-details');

async function loadDetails() {
  showLoading(detailsBox, 2);
  const result = await api.get('/auth/me');
  if (!result.ok) {
    showError(detailsBox, result.message, loadDetails);
    return;
  }
  detailsBox.replaceChildren(el('div', { class: 'panel-body' },
    el('dl', { class: 'detail-list' },
      el('div', {}, el('dt', { text: 'Name' }), el('dd', { text: result.data.name })),
      el('div', {}, el('dt', { text: 'Email address' }), el('dd', { text: result.data.email })))));
}

const form = createForm({
  submitLabel: 'Change password',
  fields: [
    { name: 'current_password', label: 'Current password', type: 'password', required: true, autocomplete: 'current-password' },
    {
      name: 'new_password',
      label: 'New password',
      type: 'password',
      required: true,
      autocomplete: 'new-password',
      help: `At least ${MIN_LENGTH} characters, and different from the current password.`,
      validate(value, values) {
        if (value.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters. This one has ${value.length}.`;
        if (new TextEncoder().encode(value).length > MAX_BYTES) return `Use ${MAX_BYTES} characters or fewer.`;
        if (value === values.current_password) return 'The new password must be different from the current one.';
        return '';
      },
    },
    {
      name: 'confirm_password',
      label: 'Confirm new password',
      type: 'password',
      required: true,
      autocomplete: 'new-password',
      help: 'Type the new password again.',
      validate: (value, values) => (value === values.new_password ? '' : 'This does not match the new password.'),
    },
  ],
  async onSubmit(values) {
    // Sent exactly as typed. Passwords are never trimmed.
    const result = await api.put('/auth/password', {
      current_password: values.current_password,
      new_password: values.new_password,
    });
    if (!result.ok) return result;

    // The old token no longer works. The server sent a new one, so this browser stays logged in.
    window.AdminAuth.startSession(result.data.token);
    form.setValues({ current_password: '', new_password: '', confirm_password: '' });
    toast('Password changed.');
    return result;
  },
});

document.getElementById('change-password').append(form.element);
loadDetails();
