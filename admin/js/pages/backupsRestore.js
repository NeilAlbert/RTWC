/**
 * admin/js/pages/backupsRestore.js: the "Restore from a backup file" panel.
 *
 * 1. Choose a file and upload it (POST .../restore/upload), or choose Restore on
 *    a saved backup (POST .../:id/restore-session). Nothing is changed.
 * 2. Enter its passphrase and check it (POST .../restore/inspect). Only a summary
 *    comes back.
 * 3. A separate final step: the admin password, the typed word RESTORE and
 *    "Restore now" (POST .../restore/apply), then GET .../restore/jobs/:id until
 *    it has finished. A restore is never started without all of these.
 */
import { el, uid } from '../components/dom.js';
import { api } from '../adminApi.js';
import { createField } from '../components/form.js';
import { localDateTime, plural, size } from '../components/backupTools.js';

const POLL_MS = 2000;
const STEPS = {
  checking: 'Checking the file...',
  safety: 'Making a safety backup of the current data...',
  data: 'Restoring the data...',
  images: 'Restoring the images...',
};
const wait = (ms) => new Promise((resolve) => { window.setTimeout(resolve, ms); });

/** Returns { element, startFromSaved(row) }. onChanged is called after a restore, to reload the list. */
export function createRestorePanel({ onChanged } = {}) {
  let session = null;
  let summary = null;
  let running = false;

  const headingId = uid('backup-restore');
  const banner = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });
  const result = el('div', { class: 'banner banner-info', role: 'status', hidden: true });

  // Step 1: the file
  const fileField = createField({
    name: 'backupFile',
    label: 'Backup file',
    type: 'file',
    required: true,
    help: 'A file ending in .rtwcbackup, downloaded from this page earlier.',
  });
  fileField.input.accept = '.rtwcbackup';
  const uploadButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Upload file' });
  const uploadStatus = el('p', { class: 'backup-progress', role: 'status' });
  const step1 = el('div', { class: 'restore-step' },
    el('h3', { class: 'restore-step-heading', text: '1. Choose the file' }),
    fileField.element,
    el('div', { class: 'form-actions backup-actions' }, uploadButton, uploadStatus));

  // Step 2: the passphrase and the summary
  const sourceLine = el('p', { class: 'restore-source' });
  const passField = createField({
    name: 'passphrase',
    label: 'Passphrase of the backup file',
    type: 'password',
    required: true,
    autocomplete: 'off',
  });
  const checkButton = el('button', { class: 'button button-secondary', type: 'button', text: 'Check the file' });
  const againButton = el('button', { class: 'link-button', type: 'button', text: 'Start again' });
  const checkStatus = el('p', { class: 'backup-progress', role: 'status' });
  const summaryBox = el('div', { class: 'restore-summary', hidden: true });
  const step2 = el('div', { class: 'restore-step', hidden: true },
    el('h3', { class: 'restore-step-heading', text: '2. Check the file' }),
    sourceLine,
    passField.element,
    el('div', { class: 'form-actions backup-actions' }, checkButton, againButton, checkStatus),
    summaryBox);

  // Step 3: the final, separate confirmation
  const imagesField = createField({ name: 'restoreImages', label: 'Also restore images', type: 'checkbox' });
  const imagesHelp = el('p', { class: 'field-help' });
  imagesField.element.append(imagesHelp);
  const adminField = createField({
    name: 'adminPassword',
    label: 'Your admin password',
    type: 'password',
    required: true,
    autocomplete: 'current-password',
    help: 'The password you use to log in to this admin.',
  });
  const confirmField = createField({
    name: 'confirmText',
    label: 'Type RESTORE to confirm',
    type: 'text',
    required: true,
    autocomplete: 'off',
  });
  confirmField.input.spellcheck = false;
  confirmField.input.setAttribute('autocapitalize', 'characters');
  const restoreButton = el('button', { class: 'button button-danger', type: 'button', text: 'Restore now', disabled: true });
  const restoreStatus = el('p', { class: 'backup-progress', role: 'status' });
  const step3 = el('div', { class: 'restore-step restore-final', hidden: true },
    el('h3', { class: 'restore-step-heading', text: '3. Restore' }),
    el('p', {
      class: 'banner banner-warning',
      text: 'Restoring replaces the current events, sermons, ministries, leaders, messages, prayer requests, newsletter list, and settings with the contents of this backup. Admin accounts are not changed. A safety backup of the current data is made first.',
    }),
    imagesField.element,
    adminField.element,
    confirmField.element,
    el('div', { class: 'form-actions backup-actions' }, restoreButton, restoreStatus));

  const element = el('section', { class: 'panel', 'aria-labelledby': headingId },
    el('div', { class: 'panel-header' }, el('h2', { id: headingId, text: 'Restore from a backup file' })),
    el('div', { class: 'panel-body form backup-form' },
      el('p', { class: 'backup-note', text: 'Choose a backup file from your device, or Restore on a saved backup above. The file is checked first. Nothing on the website changes until the last step.' }),
      result,
      banner,
      step1,
      step2,
      step3));

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = !message;
    if (message) banner.scrollIntoView({ block: 'nearest' });
  }

  function showResult(message) {
    result.textContent = message;
    result.hidden = !message;
  }

  function updateRestoreButton() {
    restoreButton.disabled = running || !session || !summary
      || !passField.getValue() || !adminField.getValue() || confirmField.getValue() !== 'RESTORE';
  }
  [passField, adminField, confirmField].forEach((field) => field.input.addEventListener('input', updateRestoreButton));

  /** Back to step 1. The fields are emptied so no passphrase or password stays on the page. */
  function reset() {
    session = null;
    summary = null;
    [fileField, passField, adminField, confirmField].forEach((field) => {
      field.setValue('');
      field.clearError();
    });
    imagesField.setValue(false);
    summaryBox.hidden = true;
    step2.hidden = true;
    step3.hidden = true;
    step1.hidden = false;
    uploadButton.disabled = false;
    uploadStatus.textContent = '';
    checkStatus.textContent = '';
    restoreStatus.textContent = '';
    updateRestoreButton();
  }

  /** The server forgot the session (15 minutes passed, or the server restarted). */
  function sessionEnded(message) {
    reset();
    showBanner(message);
  }

  function openStep2(newSession, label) {
    session = newSession;
    summary = null;
    sourceLine.textContent = label;
    step1.hidden = true;
    step2.hidden = false;
    step3.hidden = true;
    summaryBox.hidden = true;
    passField.setValue('');
    passField.focus();
    updateRestoreButton();
  }

  uploadButton.addEventListener('click', async () => {
    showBanner('');
    showResult('');
    fileField.clearError();
    const file = fileField.input.files && fileField.input.files[0];
    if (!file) {
      fileField.setError('Choose a backup file.');
      fileField.focus();
      return;
    }
    if (!/\.rtwcbackup$/i.test(file.name)) {
      fileField.setError('Choose a backup file. Its name ends in .rtwcbackup.');
      fileField.focus();
      return;
    }
    const formData = new FormData();
    formData.append('backup', file);
    uploadButton.disabled = true;
    uploadStatus.textContent = `Uploading ${size(file.size)}...`;
    const response = await api.upload('/admin/backups/restore/upload', formData);
    uploadButton.disabled = false;
    uploadStatus.textContent = '';
    if (!response.ok) {
      fileField.setError(response.message);
      fileField.focus();
      return;
    }
    openStep2(response.data, `File: ${file.name}`);
  });

  checkButton.addEventListener('click', async () => {
    showBanner('');
    passField.clearError();
    if (!passField.getValue()) {
      passField.setError('Enter the passphrase of the backup file.');
      passField.focus();
      return;
    }
    checkButton.disabled = true;
    checkStatus.textContent = 'Checking the file...';
    const response = await api.post('/admin/backups/restore/inspect', { sessionId: session.sessionId, passphrase: passField.getValue() });
    checkButton.disabled = false;
    checkStatus.textContent = '';
    if (!response.ok) {
      // 410: the session has ended. 422: this file can never be restored here, so another one is needed.
      if (response.status === 410 || response.status === 422) {
        sessionEnded(response.message);
        return;
      }
      const fieldError = response.errors.find((item) => item.field === 'passphrase');
      if (fieldError) {
        passField.setError(fieldError.message);
        passField.focus();
      } else {
        showBanner(response.message);
      }
      return;
    }
    summary = response.data.summary;
    const images = summary.includesImages ? `, ${plural(summary.imageCount, 'image', 'images')}` : ', no images';
    summaryBox.replaceChildren(
      el('p', { class: 'restore-summary-line', text: `Backup made ${localDateTime(summary.createdAt)}. ${plural(summary.totalRows, 'row', 'rows')} in ${plural(summary.tableCount, 'table', 'tables')}${images}.` }),
      el('p', { class: 'muted', text: `${size(summary.sizeBytes)}. Made by version ${summary.appVersion} of the website, with the same database version as this one.` }));
    summaryBox.hidden = false;
    imagesField.input.disabled = !summary.includesImages;
    imagesField.setValue(false);
    imagesHelp.textContent = summary.includesImages
      ? `Adds the ${plural(summary.imageCount, 'image', 'images')} from the backup. Images already on the website are kept and never overwritten.`
      : 'This backup has no images.';
    step3.hidden = false;
    adminField.setValue('');
    confirmField.setValue('');
    updateRestoreButton();
  });

  againButton.addEventListener('click', async () => {
    if (session) await api.delete(`/admin/backups/restore/sessions/${session.sessionId}`);
    reset();
    showBanner('');
    fileField.focus();
  });

  async function follow(jobId) {
    for (;;) {
      await wait(POLL_MS);
      const response = await api.get(`/admin/backups/restore/jobs/${jobId}`);
      if (response.ok) {
        if (response.data.status !== 'running') return response.data;
        restoreStatus.textContent = STEPS[response.data.step] || 'Restoring...';
      } else if (response.status === 0) {
        restoreStatus.textContent = 'Restoring... The server cannot be reached at the moment. Still trying.';
      } else {
        return { status: 'unknown', message: 'The page could not find out how the restore ended. Reload the page and check the website content.' };
      }
    }
  }

  restoreButton.addEventListener('click', async () => {
    if (restoreButton.disabled) return;
    showBanner('');
    showResult('');
    [passField, adminField, confirmField].forEach((field) => field.clearError());
    running = true;
    updateRestoreButton();
    restoreStatus.textContent = STEPS.checking;
    const response = await api.post('/admin/backups/restore/apply', {
      sessionId: session.sessionId,
      passphrase: passField.getValue(),
      adminPassword: adminField.getValue(),
      confirmText: confirmField.getValue(),
      restoreImages: imagesField.getValue(),
    });
    // The password is never kept on the page once it has been sent.
    adminField.setValue('');
    if (!response.ok) {
      running = false;
      restoreStatus.textContent = '';
      if (response.status === 410) {
        sessionEnded(response.message);
        return;
      }
      const fields = { passphrase: passField, adminPassword: adminField, confirmText: confirmField };
      let first = null;
      response.errors.forEach((item) => {
        if (fields[item.field]) {
          fields[item.field].setError(item.message);
          first = first || fields[item.field];
        }
      });
      showBanner(response.message);
      if (first) first.focus();
      updateRestoreButton();
      return;
    }

    const job = await follow(response.data.jobId);
    running = false;
    if (job.status === 'success') {
      const images = job.images
        ? ` ${plural(job.images.written, 'image was', 'images were')} added${job.images.skipped ? ` and ${plural(job.images.skipped, 'was', 'were')} already there` : ''}.`
        : '';
      reset();
      showResult(`${job.message}${images}`);
      result.scrollIntoView({ block: 'nearest' });
    } else {
      restoreStatus.textContent = '';
      confirmField.setValue('');
      updateRestoreButton();
      showBanner(job.message);
    }
    if (onChanged) onChanged();
  });

  /** Starts the same steps from a backup saved on the server: passphrase, summary, confirmation. */
  async function startFromSaved(row) {
    showBanner('');
    showResult('');
    if (session) await api.delete(`/admin/backups/restore/sessions/${session.sessionId}`);
    reset();
    const response = await api.post(`/admin/backups/${row.id}/restore-session`);
    element.scrollIntoView({ block: 'start' });
    if (!response.ok) {
      showBanner(response.message);
      return;
    }
    openStep2(response.data, `Saved backup made ${localDateTime(row.startedAt)}`);
  }

  return { element, startFromSaved };
}
