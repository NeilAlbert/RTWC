/**
 * admin/js/pages/newsletter.js: the addresses signed up for the newsletter.
 *
 * "Export as CSV" fetches every page of subscribers and builds the file here
 * in the browser. A cell that starts with = + - @ (or a tab or carriage return)
 * gets a ' in front, so a spreadsheet shows it as text instead of running it
 * as a formula.
 */
import '../shell.js';
import { el, formatDateTime } from '../components/dom.js';
import { api, query } from '../adminApi.js';
import { createTable } from '../components/table.js';
import { createPagination } from '../components/pagination.js';
import { createFilterBar } from '../components/filterBar.js';
import { confirmDialog } from '../components/dialog.js';
import { toast } from '../components/toast.js';

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 100;
const root = document.getElementById('page-root');
const exportButton = document.getElementById('page-action');
const state = { page: 1, q: '' };

const problem = el('div', { class: 'banner banner-error page-problem', role: 'alert', hidden: true });
const notice = el('div', { class: 'banner banner-info page-problem', role: 'status', hidden: true });

function showProblem(message) {
  problem.textContent = message;
  problem.hidden = !message;
  if (message) problem.scrollIntoView({ block: 'nearest' });
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}

async function remove(row) {
  const confirmed = await confirmDialog({
    title: 'Remove this subscriber?',
    message: `${row.email} will be taken off the newsletter list. They can sign up again on the website.`,
    confirmLabel: 'Remove',
  });
  if (!confirmed) return;

  showProblem('');
  showNotice('');
  const result = await api.delete(`/admin/newsletter/${row.id}`);
  if (!result.ok) {
    showProblem(result.message);
    if (result.status === 404) load();
    return;
  }
  toast('Subscriber removed.');
  load();
}

const table = createTable({
  caption: 'Newsletter subscribers, newest first',
  columns: [
    { label: 'Email', rowHeader: true, wrap: true, render: (row) => row.email },
    { label: 'Subscribed', render: (row) => formatDateTime(row.subscribed_at) },
  ],
  actions: (row) => [{ label: 'Remove', name: row.email, danger: true, onClick: remove }],
  empty: {
    get text() {
      return state.q ? 'No subscribers match this search.' : 'Nobody has signed up for the newsletter yet.';
    },
  },
});

const pager = createPagination({
  label: 'Subscriber pages',
  onChange: (page) => {
    state.page = page;
    load();
  },
});
table.footer.append(pager.element);

let latest = 0;
async function load() {
  latest += 1;
  const mine = latest;
  table.showLoading();
  const result = await api.get(`/admin/newsletter${query({ page: state.page, limit: PAGE_SIZE, q: state.q })}`);
  if (mine !== latest) return;
  if (!result.ok) {
    table.showError(result.message, load);
    return;
  }
  const { items, pagination } = result.data;
  if (items.length === 0 && pagination.total > 0 && state.page > 1) {
    state.page = Math.max(1, pagination.totalPages);
    load();
    return;
  }
  table.showRows(items);
  pager.update(pagination);
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/** One CSV cell: quoted, with " doubled, and a ' in front of anything a spreadsheet would run. */
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function todayStamp() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Every subscriber, whatever the search box says. Stops at the first page that fails. */
async function fetchAll() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await api.get(`/admin/newsletter${query({ page, limit: EXPORT_PAGE_SIZE })}`);
    if (!result.ok) return result;
    all.push(...result.data.items);
    totalPages = result.data.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return { ok: true, items: all };
}

function download(filename, text) {
  // The byte order mark makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: filename, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportCsv() {
  showProblem('');
  showNotice('');
  exportButton.disabled = true;
  exportButton.textContent = 'Exporting';
  const result = await fetchAll();
  exportButton.disabled = false;
  exportButton.textContent = 'Export as CSV';

  if (!result.ok) {
    showProblem(`The list could not be exported. ${result.message}`);
    return;
  }
  if (result.items.length === 0) {
    showNotice('There are no subscribers to export yet.');
    return;
  }
  const lines = [['Email', 'Subscribed'].map(csvCell).join(',')];
  result.items.forEach((row) => lines.push([row.email, row.subscribed_at].map(csvCell).join(',')));
  const filename = `newsletter-subscribers-${todayStamp()}.csv`;
  download(filename, `${lines.join('\r\n')}\r\n`);
  showNotice(`${result.items.length} ${result.items.length === 1 ? 'subscriber' : 'subscribers'} exported to ${filename}.`);
}

root.append(
  createFilterBar({
    search: {
      label: 'Search email',
      onSearch: (text) => {
        state.q = text;
        state.page = 1;
        load();
      },
    },
  }).element,
  problem,
  notice,
  table.element
);
exportButton.addEventListener('click', exportCsv);
load();
