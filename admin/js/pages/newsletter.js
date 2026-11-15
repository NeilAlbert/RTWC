/* Admin > Newsletter: the list of subscribers, with search, remove and a CSV export. */

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('newsletter', 'Newsletter');

  const { el, toast, confirmAction, createTable, createPagination, formatDate } = window.AdminUI;
  const searchForm = document.getElementById('subscriber-search-form');
  const searchInput = document.getElementById('subscriber-search');
  const clearButton = document.getElementById('subscriber-search-clear');
  const exportButton = document.getElementById('export-subscribers');
  const exportStatus = document.getElementById('export-status');
  const alertHost = document.getElementById('page-alert');
  const EXPORT_PAGE_SIZE = 100;

  let page = 1;
  let query = '';
  let loadCount = 0;

  function showAlert(message) {
    alertHost.textContent = message || '';
    alertHost.classList.toggle('visible', Boolean(message));
  }

  const table = createTable({
    label: 'Newsletter subscribers',
    columns: [
      { label: 'Email', render: (row) => row.email },
      { label: 'Date subscribed', render: (row) => formatDate(row.subscribed_at) },
      {
        label: 'Actions',
        actions: true,
        render: (row) => el('button', {
          type: 'button',
          class: 'btn-text btn-text-danger',
          text: 'Remove',
          'aria-label': `Remove: ${row.email}`,
          on: { click: () => removeSubscriber(row) },
        }),
      },
    ],
  });
  document.getElementById('subscriber-table').replaceChildren(table.element);

  const pagination = createPagination((next) => { page = next; load(); });
  document.getElementById('subscriber-pagination').replaceChildren(pagination.element);

  async function load() {
    loadCount += 1;
    const thisLoad = loadCount;
    table.showLoading();
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (query) params.set('q', query);
      const response = await AdminApi.get(`/admin/newsletter?${params}`);
      if (thisLoad !== loadCount) return;

      const { items, pagination: meta } = response.data;
      if (items.length === 0 && page > 1) {
        page -= 1;
        load();
        return;
      }
      if (items.length === 0) {
        table.showEmpty(query ? `No subscriber has "${query}" in the email address.` : 'Nobody has subscribed yet.');
      } else {
        table.showRows(items);
      }
      pagination.update(meta);
    } catch (err) {
      if (thisLoad !== loadCount) return;
      pagination.update({ page: 1, limit: 1, total: 0 });
      table.showError(
        err.status === 0
          ? 'The subscribers could not be loaded because the server cannot be reached.'
          : `The subscribers could not be loaded. ${err.message}`,
        load
      );
    }
  }

  async function removeSubscriber(row) {
    showAlert('');
    const confirmed = await confirmAction({
      title: 'Remove subscriber',
      message: 'Remove this subscriber? This cannot be undone.',
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    try {
      await AdminApi.delete(`/admin/newsletter/${row.id}`);
      toast('The subscriber was removed.');
      load();
    } catch (err) {
      showAlert(err.status === 0
        ? 'The subscriber was not removed because the server cannot be reached.'
        : `The subscriber was not removed. ${err.message}`);
      toast('The subscriber was not removed.', 'error');
    }
  }

  /**
   * One CSV cell. A spreadsheet treats a cell that starts with =, +, - or @ (or a
   * tab or line break) as a formula, so such a cell gets a single quote in front.
   * That stops an email address someone typed from running as a formula.
   */
  function csvCell(value) {
    let text = String(value === null || value === undefined ? '' : value);
    if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  /** Every subscriber, not only the page on screen or the current search. */
  async function fetchAllSubscribers() {
    const all = [];
    let exportPage = 1;
    let totalPages = 1;
    do {
      // Pages are fetched one after another on purpose: the order must be kept.
      // eslint-disable-next-line no-await-in-loop
      const response = await AdminApi.get(`/admin/newsletter?page=${exportPage}&limit=${EXPORT_PAGE_SIZE}`);
      all.push(...response.data.items);
      totalPages = response.data.pagination.totalPages;
      exportPage += 1;
    } while (exportPage <= totalPages);
    return all;
  }

  exportButton.addEventListener('click', async () => {
    showAlert('');
    exportButton.disabled = true;
    exportStatus.textContent = 'Preparing the file.';
    try {
      const subscribers = await fetchAllSubscribers();
      const lines = [['Email', 'Date subscribed'], ...subscribers.map((row) => [row.email, String(row.subscribed_at).slice(0, 10)])];
      // The first character tells Excel the file is UTF-8.
      const csv = `﻿${lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n')}\r\n`;

      const today = new Date();
      const stamp = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = el('a', { href: url, download: `newsletter-subscribers-${stamp}.csv` });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      exportStatus.textContent = `Exported ${subscribers.length} ${subscribers.length === 1 ? 'subscriber' : 'subscribers'}.`;
      toast('The CSV file was downloaded.');
    } catch (err) {
      exportStatus.textContent = '';
      showAlert(err.status === 0
        ? 'The file was not exported because the server cannot be reached.'
        : `The file was not exported. ${err.message}`);
      toast('The file was not exported.', 'error');
    } finally {
      exportButton.disabled = false;
    }
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    query = searchInput.value.trim();
    clearButton.hidden = !query;
    page = 1;
    load();
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    query = '';
    clearButton.hidden = true;
    page = 1;
    load();
    searchInput.focus();
  });

  load();
});
