/**
 * admin/js/pages/backups.js: make, list, download, delete and restore backups,
 * and the automatic monthly backup.
 *
 * "Create backup" sends the passphrase once with POST /api/admin/backups, which
 * answers as soon as the backup has started. The page then asks for
 * GET /api/admin/backups/:id every 2 seconds until it has finished.
 *
 * A download cannot carry the sign-in token (it is a plain navigation), so the
 * page first asks for a single-use ticket and then opens the download address
 * with it. The passphrase is never kept: the fields are emptied once it is sent.
 *
 * The automatic backup and restore panels are in backupsAutomatic.js and
 * backupsRestore.js.
 */
import '../shell.js';
import { el, uid } from '../components/dom.js';
import { api } from '../adminApi.js';
import { createField } from '../components/form.js';
import { createTable } from '../components/table.js';
import { confirmDialog } from '../components/dialog.js';
import { toast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import {
  KINDS, localDateTime, plural, size, startDownload,
} from '../components/backupTools.js';
import { createAutomaticPanel } from './backupsAutomatic.js';
import { createRestorePanel } from './backupsRestore.js';

const root = document.getElementById('page-root');
const POLL_MS = 2000;
const LIST_POLL_MS = 3000;
// The server stops a backup after 30 minutes; the page stops waiting a little later.
const GIVE_UP_AFTER_MS = 35 * 60 * 1000;

const STATUSES = {
  success: { label: 'Ready', tone: 'success' },
  running: { label: 'Running', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
};

let minLength = 12;
let creating = false;
let othersRunning = false;
let listTimer = 0;
let loadedOnce = false;

const wait = (ms) => new Promise((resolve) => { window.setTimeout(resolve, ms); });

// ---------------------------------------------------------------------------
// A problem with a download or delete, shown above the panels.
// ---------------------------------------------------------------------------
const problem = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });

function showProblem(message) {
  problem.textContent = message;
  problem.hidden = !message;
  if (message) problem.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------------------
// Panel 1: Create a backup
// ---------------------------------------------------------------------------
const includeField = createField({
  name: 'includeImages',
  label: 'Include uploaded images',
  type: 'checkbox',
  help: 'Adds the photos uploaded through this admin.',
});
const passField = createField({
  name: 'passphrase',
  label: 'Passphrase',
  type: 'password',
  required: true,
  autocomplete: 'new-password',
  help: 'At least 12 characters. A short sentence of ordinary words is easy to remember and hard to guess.',
});
const confirmField = createField({
  name: 'passphraseConfirm',
  label: 'Type the passphrase again',
  type: 'password',
  required: true,
  autocomplete: 'new-password',
});
const imageHelp = includeField.element.querySelector('.field-help');

const formBanner = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });
const submit = el('button', { class: 'button', type: 'submit', text: 'Create backup' });
const progress = el('p', { class: 'backup-progress', role: 'status' });
const createHeadingId = uid('backup-create');
const form = el('form', { class: 'panel-body form backup-form', novalidate: true },
  formBanner,
  includeField.element,
  passField.element,
  confirmField.element,
  el('p', { class: 'banner banner-info', text: 'This password cannot be recovered. Keep it in a password manager. Without it, the backup cannot be opened.' }),
  el('div', { class: 'form-actions backup-actions' }, submit, progress));
const createPanel = el('section', { class: 'panel', 'aria-labelledby': createHeadingId },
  el('div', { class: 'panel-header' }, el('h2', { id: createHeadingId, text: 'Create a backup' })),
  form);

function showFormBanner(message) {
  formBanner.textContent = message;
  formBanner.hidden = !message;
}

function setCreating(on, message) {
  creating = on;
  submit.disabled = on || othersRunning;
  includeField.input.disabled = on;
  progress.textContent = message;
}

/** Asks for the backup until it is no longer running. Resolves to its record, or null. */
async function waitForBackup(id) {
  const started = Date.now();
  while (Date.now() - started < GIVE_UP_AFTER_MS) {
    await wait(POLL_MS);
    const result = await api.get(`/admin/backups/${id}`);
    if (result.ok) {
      if (result.data.backup.status !== 'running') return result.data.backup;
      progress.textContent = 'Creating backup...';
    } else if (result.status === 0) {
      // The server may be restarting. The backup row tells the truth once it is back.
      progress.textContent = 'Creating backup... The server cannot be reached at the moment. Still trying.';
    } else {
      return null;
    }
  }
  return null;
}

function fieldFor(name) {
  if (name === 'passphrase') return passField;
  if (name === 'passphraseConfirm') return confirmField;
  return null;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (creating) return;
  [passField, confirmField].forEach((field) => field.clearError());
  showFormBanner('');

  const passphrase = passField.getValue();
  const again = confirmField.getValue();
  let invalid = null;
  if (passphrase.length < minLength) {
    invalid = passField;
    passField.setError(`Use at least ${minLength} characters.`);
  } else if (again !== passphrase) {
    invalid = confirmField;
    confirmField.setError('The two passphrases are not the same.');
  }
  if (invalid) {
    showFormBanner('Some fields need attention. No backup was made.');
    invalid.focus();
    return;
  }

  setCreating(true, 'Creating backup...');
  const result = await api.post('/admin/backups', { includeImages: includeField.getValue(), passphrase, passphraseConfirm: again });
  if (!result.ok) {
    setCreating(false, '');
    showFormBanner(result.message);
    let first = null;
    result.errors.forEach((item) => {
      const field = fieldFor(item.field);
      if (field) {
        field.setError(item.message);
        first = first || field;
      }
    });
    if (first) first.focus();
    if (result.status === 409) load();
    return;
  }

  // Sent once and not kept anywhere on this page.
  passField.setValue('');
  confirmField.setValue('');
  load();

  const finished = await waitForBackup(result.data.backup.id);
  if (finished && finished.status === 'success') {
    setCreating(false, 'Backup created. Download it below to keep a copy on your device.');
    toast('Backup created.');
  } else if (finished) {
    setCreating(false, '');
    showFormBanner(`The backup could not be made. ${finished.errorMessage || ''}`.trim());
  } else {
    setCreating(false, '');
    showFormBanner('The page could not find out whether the backup finished. Reload the page to see the list.');
  }
  load();
});

function updateImageHelp(uploads) {
  if (!uploads) return;
  imageHelp.textContent = uploads.count === 0
    ? 'There are no uploaded images at the moment, so this adds nothing.'
    : `Adds about ${size(uploads.bytes)} for ${plural(uploads.count, 'image', 'images')}. Without them the backup holds the text and settings only.`;
}

// ---------------------------------------------------------------------------
// Panel 2: Saved backups
// ---------------------------------------------------------------------------
function describe(row) {
  return `backup of ${localDateTime(row.startedAt)}`;
}

function contents(row) {
  if (row.status === 'running') return el('span', { class: 'muted', text: 'Being made' });
  if (row.status !== 'success') return el('span', { class: 'muted', text: 'Not finished' });
  return el('span', {},
    `${plural(row.totalRows, 'row', 'rows')} in ${plural(row.tableCount, 'table', 'tables')}`,
    el('span', { class: 'cell-sub', text: row.includesImages ? plural(row.imageCount, 'image', 'images') : 'No images' }));
}

function statusCell(row) {
  if (row.status === 'success' && !row.fileAvailable) {
    return el('span', {}, tag('File missing', 'warning'), el('span', { class: 'cell-sub', text: 'The file is no longer on the server.' }));
  }
  const status = STATUSES[row.status] || STATUSES.failed;
  return el('span', {},
    tag(status.label, status.tone),
    row.status === 'failed' && row.errorMessage ? el('span', { class: 'cell-sub', text: row.errorMessage }) : null);
}

async function download(row) {
  showProblem('');
  const result = await startDownload(row.id);
  if (!result.ok) {
    showProblem(result.message);
    load();
    return;
  }
  toast('Download started. Keep the file somewhere safe that is not the server.');
  window.setTimeout(load, 2000);
}

async function remove(row) {
  const when = localDateTime(row.startedAt);
  const confirmed = await confirmDialog({
    title: 'Delete this backup?',
    message: row.status === 'success'
      ? `The backup made on ${when} will be removed from the server. A copy you have downloaded to your device is not affected.`
      : `The record of this unfinished backup from ${when} will be removed from the list. There is no backup file for it.`,
    confirmLabel: 'Delete backup',
  });
  if (!confirmed) return;
  showProblem('');
  const result = await api.delete(`/admin/backups/${row.id}`);
  if (!result.ok) {
    showProblem(result.message);
  } else {
    toast('Backup deleted.');
  }
  load();
}

const table = createTable({
  caption: 'Saved backups, newest first',
  columns: [
    { label: 'Created', rowHeader: true, render: (row) => el('span', { class: 'cell-date', text: localDateTime(row.startedAt) }) },
    { label: 'Type', render: (row) => tag((KINDS[row.kind] || KINDS.manual).label, (KINDS[row.kind] || KINDS.manual).tone) },
    { label: 'Contents', render: contents },
    { label: 'Size', numeric: true, render: (row) => (row.status === 'success' ? size(row.sizeBytes) : '') },
    { label: 'Status', wrap: true, render: statusCell },
    { label: 'Downloaded', render: (row) => (row.downloadedAt ? 'Yes' : 'No') },
  ],
  actions: (row) => {
    const items = [];
    if (row.status === 'success' && row.fileAvailable) {
      items.push({ label: 'Download', name: describe(row), onClick: download });
      // Starts the same steps as a file from the device: passphrase, summary, confirmation.
      items.push({ label: 'Restore', name: describe(row), onClick: (chosen) => restorePanel.startFromSaved(chosen) });
    }
    items.push({
      label: 'Delete',
      name: describe(row),
      danger: true,
      disabled: row.status === 'running',
      hint: row.status === 'running' ? 'Running, so it cannot be deleted yet.' : '',
      onClick: remove,
    });
    return items;
  },
  empty: { text: 'No backups yet. Create your first backup above.' },
});

const listHeadingId = uid('backup-list');
const summary = el('p', { class: 'backup-summary' });
table.element.prepend(el('div', { class: 'panel-header' }, el('h2', { id: listHeadingId, text: 'Saved backups' }), summary));
const listPanel = el('section', { class: 'backup-list', 'aria-labelledby': listHeadingId }, table.element);

function updateSummary({ totals, freeBytes }) {
  const kept = `${plural(totals.count, 'backup', 'backups')} kept, ${size(totals.totalBytes)} in total.`;
  summary.textContent = freeBytes === null || freeBytes === undefined ? kept : `${kept} ${size(freeBytes)} free on the server.`;
}

/** While a backup started elsewhere is running, "Create backup" waits and the list keeps itself up to date. */
function followRunning(running) {
  window.clearTimeout(listTimer);
  othersRunning = running && !creating;
  if (!creating) {
    submit.disabled = othersRunning;
    if (othersRunning) progress.textContent = 'A backup is running. You can start another one when it has finished.';
    else if (progress.textContent.startsWith('A backup is running')) progress.textContent = '';
  }
  if (running) listTimer = window.setTimeout(load, LIST_POLL_MS);
}

// ---------------------------------------------------------------------------
// The notice when no backup has been downloaded to a device in 35 days
// ---------------------------------------------------------------------------
const notice = el('div', { class: 'banner banner-info', role: 'status', hidden: true });

async function loadNotice() {
  const result = await api.get('/admin/backups/summary');
  if (!result.ok || !result.data.downloadNotice) {
    notice.hidden = true;
    return;
  }
  const { latest } = result.data;
  const action = latest && latest.fileAvailable
    ? el('button', {
      class: 'button button-secondary',
      type: 'button',
      text: 'Download the latest backup',
      onclick: () => download(latest),
    })
    : el('span', { text: 'Create a backup below and download it.' });
  notice.replaceChildren(el('span', { text: 'No backup has been downloaded to your device recently.' }), action);
  notice.hidden = false;
}

const automaticPanel = createAutomaticPanel({ onSaved: loadNotice });
const restorePanel = createRestorePanel({ onChanged: () => load() });

async function load() {
  loadNotice();
  if (!loadedOnce) table.showLoading();
  const result = await api.get('/admin/backups');
  if (!result.ok) {
    loadedOnce = false;
    summary.textContent = '';
    table.showError(result.message, load);
    return;
  }
  loadedOnce = true;
  const { data } = result;
  if (data.limits && data.limits.minPassphraseLength) minLength = data.limits.minPassphraseLength;
  updateImageHelp(data.uploads);
  updateSummary(data);
  table.showRows(data.items);
  followRunning(data.running);
}

root.append(notice, problem, createPanel, listPanel, automaticPanel.element);
// The restore panel comes last, after the advice on keeping a copy, apart from everything else.
document.getElementById('restore-root').append(restorePanel.element);
load();
automaticPanel.load();
