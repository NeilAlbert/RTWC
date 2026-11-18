/**
 * admin/js/pages/backupsAutomatic.js: the "Automatic monthly backup" panel of the
 * Backups page. Reads GET /api/admin/backups/automatic and saves with PUT.
 *
 * The switch cannot be turned on while BACKUP_PASSPHRASE is not set on the
 * server; the panel then says so and the server refuses it too.
 */
import { el, uid } from '../components/dom.js';
import { api } from '../adminApi.js';
import { createField } from '../components/form.js';
import { showLoading, showError } from '../components/states.js';
import { tag } from '../components/tag.js';
import { toast } from '../components/toast.js';
import { localDateTime } from '../components/backupTools.js';

function describeNext(data) {
  if (!data.enabled) return 'Switched off.';
  if (!data.passphraseSet) return 'Cannot run until BACKUP_PASSPHRASE is set on the server.';
  if (!data.next) return 'Switched off.';
  if (data.next.running) return 'Running now.';
  if (data.next.soon) return 'Within the next hour.';
  return localDateTime(data.next.at);
}

function describeLast(last) {
  if (!last) return el('span', { text: 'None yet.' });
  if (last.status === 'success') {
    return el('span', {}, tag('Ready', 'success'), ` Finished ${localDateTime(last.finishedAt)}.`);
  }
  return el('span', {},
    tag('Failed', 'danger'),
    ` ${localDateTime(last.startedAt)}. ${last.errorMessage || ''} Tried ${last.attempts} of 3 times this month.`);
}

/** Returns { element, load() }. onSaved is called after a save, so the page can refresh its notices. */
export function createAutomaticPanel({ onSaved } = {}) {
  const headingId = uid('backup-auto');
  const body = el('div', { class: 'panel-body' });
  const element = el('section', { class: 'panel', 'aria-labelledby': headingId },
    el('div', { class: 'panel-header' }, el('h2', { id: headingId, text: 'Automatic monthly backup' })),
    body);

  function render(data) {
    const enabledField = createField({
      name: 'enabled',
      label: 'Make a backup automatically every month',
      type: 'checkbox',
      help: 'On the 1st of each month from 02:00 UTC, or as soon as the server is running after that. It is locked with the passphrase set on the server (BACKUP_PASSPHRASE), not one typed here.',
    });
    const keepField = createField({
      name: 'keep',
      label: 'How many automatic backups to keep',
      type: 'number',
      required: true,
      min: String(data.keepLimits.min),
      max: String(data.keepLimits.max),
      help: `From ${data.keepLimits.min} to ${data.keepLimits.max}. After a new automatic backup, older automatic ones are deleted. Manual backups and safety backups are never deleted by this.`,
      validate: (value) => {
        const number = Number(value);
        return Number.isInteger(number) && number >= data.keepLimits.min && number <= data.keepLimits.max
          ? '' : `Enter a whole number from ${data.keepLimits.min} to ${data.keepLimits.max}.`;
      },
    });
    const imagesField = createField({ name: 'includeImages', label: 'Include uploaded images', type: 'checkbox' });
    enabledField.setValue(data.enabled);
    keepField.setValue(data.keep);
    imagesField.setValue(data.includeImages);
    if (!data.passphraseSet && !data.enabled) enabledField.input.disabled = true;

    const banner = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });
    const saveButton = el('button', { class: 'button', type: 'submit', text: 'Save' });
    const status = el('p', { class: 'backup-progress', role: 'status' });
    const form = el('form', { class: 'form backup-form', novalidate: true },
      data.passphraseSet ? null : el('p', {
        class: 'banner banner-info',
        text: 'Automatic backups cannot be switched on because BACKUP_PASSPHRASE is not set on the server. Whoever looks after the server needs to add it to server/.env and restart the server. See BACKUPS.md.',
      }),
      banner,
      enabledField.element,
      keepField.element,
      imagesField.element,
      el('dl', { class: 'detail-list' },
        el('div', {}, el('dt', { text: 'Next automatic backup' }), el('dd', { text: describeNext(data) })),
        el('div', {}, el('dt', { text: 'Last automatic backup' }), el('dd', {}, describeLast(data.lastResult)))),
      el('div', { class: 'form-actions backup-actions' }, saveButton, status));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      [keepField].forEach((field) => field.clearError());
      banner.hidden = true;
      const keepProblem = keepField.validate(keepField.getValue());
      if (keepProblem) {
        keepField.setError(keepProblem);
        keepField.focus();
        return;
      }
      saveButton.disabled = true;
      status.textContent = 'Saving...';
      const result = await api.put('/admin/backups/automatic', {
        enabled: enabledField.getValue(),
        keep: Number(keepField.getValue()),
        includeImages: imagesField.getValue(),
      });
      saveButton.disabled = false;
      status.textContent = '';
      if (!result.ok) {
        banner.textContent = result.message;
        banner.hidden = false;
        result.errors.forEach((item) => { if (item.field === 'keep') keepField.setError(item.message); });
        return;
      }
      toast('Automatic backup settings saved.');
      render(result.data);
      if (onSaved) onSaved();
    });

    body.replaceChildren(form);
  }

  async function load() {
    showLoading(body, 3);
    const result = await api.get('/admin/backups/automatic');
    if (!result.ok) {
      showError(body, result.message, load);
      return;
    }
    render(result.data);
  }

  return { element, load };
}
