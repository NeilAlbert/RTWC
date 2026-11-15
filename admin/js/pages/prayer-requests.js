/* Admin > Prayer Requests.
   A private request is listed as "Private", without its name or text. The server
   sends those only when that one request is opened. There is deliberately no
   export and no way to copy every request at once. */

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('prayer-requests', 'Prayer Requests');

  const { el, formatDate, inboxPage } = window.AdminUI;
  const PREVIEW_LENGTH = 80;
  const EMPTY_TEXT = {
    '': 'No prayer requests have been received yet.',
    new: 'There are no new prayer requests.',
    prayed_for: 'There are no prayer requests marked as prayed for.',
  };

  function preview(text) {
    const oneLine = String(text || '').replace(/\s+/g, ' ').trim();
    return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH)}...` : oneLine;
  }

  inboxPage({
    noun: 'prayer request',
    tableLabel: 'Prayer requests',
    dialogTitle: 'Prayer request',
    path: '/admin/prayer-requests',
    tableHost: document.getElementById('prayer-table'),
    paginationHost: document.getElementById('prayer-pagination'),
    alertHost: document.getElementById('page-alert'),
    statusFilter: document.getElementById('prayer-status'),
    statuses: [
      ['new', 'New', 'warning'],
      ['prayed_for', 'Prayed for', 'success'],
    ],
    fetchOnOpen: true,
    nameOf: (row) => (row.is_private ? 'private prayer request' : `prayer request from ${row.name}`),
    columns: [
      { label: 'Name', render: (row) => (row.is_private ? 'Private' : row.name) },
      { label: 'Request', render: (row) => (row.is_private ? 'Private request. Open it to read.' : preview(row.request_text)) },
      { label: 'Date', render: (row) => formatDate(row.created_at) },
    ],
    emptyText: (status) => EMPTY_TEXT[status],
    detail: (item) => [
      el('dl', { class: 'detail-list' }, [
        el('dt', { text: 'From' }),
        el('dd', { text: item.name }),
        el('dt', { text: 'Received' }),
        el('dd', { text: formatDate(item.created_at) }),
        el('dt', { text: 'Privacy' }),
        el('dd', { text: item.is_private
          ? 'Private. Only the pastor and prayer leaders should see this.'
          : 'Not marked private.' }),
      ]),
      el('p', { class: 'detail-text', text: item.request_text }),
    ],
  });
});
