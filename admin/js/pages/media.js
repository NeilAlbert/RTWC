/**
 * admin/js/pages/media.js: the images uploaded through the admin.
 * Shows where each is used, uploads a new one, and deletes one that is not in use.
 */
import '../shell.js';
import { el, formatDateTime, formatFileSize } from '../components/dom.js';
import { api, query } from '../adminApi.js';
import { createTable } from '../components/table.js';
import { createPagination } from '../components/pagination.js';
import { createImageUpload } from '../components/imageUpload.js';
import { openDialog, confirmDialog } from '../components/dialog.js';
import { toast } from '../components/toast.js';

const PAGE_SIZE = 24;
const root = document.getElementById('page-root');
let page = 1;

const problem = el('div', { class: 'banner banner-error page-problem', role: 'alert', hidden: true });

function showProblem(message) {
  problem.textContent = message;
  problem.hidden = !message;
}

function usedBy(row) {
  if (row.used_by.length === 0) return el('span', { class: 'muted', text: 'Not used' });
  return el('ul', {}, row.used_by.map((use) => el('li', { text: use })));
}

async function remove(row) {
  const confirmed = await confirmDialog({
    title: 'Delete this image?',
    message: `${row.filename} will be deleted from the server. This cannot be undone.`,
  });
  if (!confirmed) return;

  showProblem('');
  const result = await api.delete(`/admin/media/${encodeURIComponent(row.filename)}`);
  if (!result.ok) {
    showProblem(result.message);
    problem.scrollIntoView({ block: 'nearest' });
    // The list may be out of date, for example the image was put to use a moment ago.
    load();
    return;
  }
  toast('Image deleted.');
  load();
}

function upload() {
  let uploaded = false;
  const field = createImageUpload({ name: 'image', label: 'Image', required: true });
  // The field uploads as soon as a file is chosen. Its value then holds the saved address.
  field.element.addEventListener('change', () => { uploaded = true; });
  openDialog({
    title: 'Upload image',
    body: el('div', {},
      field.element,
      el('p', { class: 'field-help', text: 'To use an image, choose it in the form for a sermon, ministry or leader. Images uploaded here are kept until you delete them.' })),
    actions: [{ label: 'Done', variant: 'primary', onClick: ({ close }) => close() }],
    // Waits for an upload that is still running, so the list shows it.
    canClose: () => !field.isBusy(),
    onClose: () => {
      if (!uploaded) return;
      page = 1;
      load();
    },
  });
}

const table = createTable({
  caption: 'Uploaded images, newest first',
  columns: [
    // Decorative: the file name is in the next column.
    { label: 'Image', render: (row) => el('img', { class: 'table-thumb', src: row.url, alt: '', width: '48', height: '48', loading: 'lazy' }) },
    { label: 'File', rowHeader: true, wrap: true, render: (row) => el('a', { href: row.url, target: '_blank', rel: 'noopener', text: row.filename }) },
    { label: 'Size', numeric: true, render: (row) => formatFileSize(row.size) },
    { label: 'Uploaded', render: (row) => formatDateTime(row.uploaded_at) },
    { label: 'Used by', wrap: true, render: usedBy },
  ],
  actions: (row) => [{
    label: 'Delete',
    name: row.filename,
    danger: true,
    disabled: row.used_by.length > 0,
    hint: row.used_by.length > 0 ? 'In use, so it cannot be deleted.' : '',
    onClick: remove,
  }],
  empty: { text: 'No images have been uploaded yet.', action: { label: 'Upload image', onClick: upload } },
});

const pager = createPagination({
  label: 'Image pages',
  onChange: (next) => {
    page = next;
    load();
  },
});
table.footer.append(pager.element);

async function load() {
  table.showLoading();
  const result = await api.get(`/admin/media${query({ page, limit: PAGE_SIZE })}`);
  if (!result.ok) {
    table.showError(result.message, load);
    return;
  }
  page = result.data.pagination.page;
  table.showRows(result.data.items);
  pager.update(result.data.pagination);
}

root.append(problem, table.element);
document.getElementById('page-action').addEventListener('click', upload);
load();
