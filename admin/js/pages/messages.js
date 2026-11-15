/* Admin > Messages: what visitors sent through the contact form.
   Opening a new message marks it as read. */

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('messages', 'Messages');

  const { el, formatDate, inboxPage } = window.AdminUI;
  const PREVIEW_LENGTH = 80;
  const EMPTY_TEXT = {
    '': 'No messages have been received yet.',
    new: 'There are no new messages.',
    read: 'There are no read messages.',
    responded: 'There are no messages marked as responded.',
  };

  function preview(text) {
    const oneLine = String(text || '').replace(/\s+/g, ' ').trim();
    return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH)}...` : oneLine;
  }

  inboxPage({
    noun: 'message',
    tableLabel: 'Messages',
    dialogTitle: 'Message',
    path: '/admin/contact',
    tableHost: document.getElementById('message-table'),
    paginationHost: document.getElementById('message-pagination'),
    alertHost: document.getElementById('page-alert'),
    statusFilter: document.getElementById('message-status'),
    statuses: [
      ['new', 'New', 'warning'],
      ['read', 'Read', 'neutral'],
      ['responded', 'Responded', 'success'],
    ],
    markOnOpen: 'read',
    nameOf: (row) => `message from ${row.name}`,
    columns: [
      { label: 'Name', render: (row) => row.name },
      { label: 'Email', render: (row) => row.email },
      { label: 'Message', render: (row) => preview(row.message) },
      { label: 'Date', render: (row) => formatDate(row.created_at) },
    ],
    emptyText: (status) => EMPTY_TEXT[status],
    detail: (item) => [
      el('dl', { class: 'detail-list' }, [
        el('dt', { text: 'From' }),
        el('dd', { text: item.name }),
        el('dt', { text: 'Email' }),
        el('dd', {}, el('a', { href: `mailto:${item.email}`, text: item.email })),
        el('dt', { text: 'Received' }),
        el('dd', { text: formatDate(item.created_at) }),
      ]),
      el('p', { class: 'detail-text', text: item.message }),
    ],
  });
});
