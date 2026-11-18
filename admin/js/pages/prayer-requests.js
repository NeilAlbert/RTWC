/**
 * admin/js/pages/prayer-requests.js: prayer requests sent through the website.
 *
 * A private request shows only "Private" in the table. Its name and text come
 * from the server only when that one request is opened, and this page has no
 * export or copy-all.
 */
import '../shell.js';
import { el, formatDateTime } from '../components/dom.js';
import { createInboxPage } from '../components/inboxPage.js';
import { tag } from '../components/tag.js';

createInboxPage({
  root: document.getElementById('page-root'),
  endpoint: '/admin/prayer-requests',
  noun: 'prayer request',
  nameOf: (row) => (row.is_private ? 'a private sender' : row.name),
  caption: 'Prayer requests, newest first',
  statuses: [
    { value: 'new', label: 'New', tone: 'info' },
    { value: 'prayed_for', label: 'Prayed for', tone: 'success' },
  ],
  columns: [
    {
      label: 'Name',
      rowHeader: true,
      wrap: true,
      render: (row) => (row.is_private ? 'Private' : row.name),
    },
    {
      label: 'Request',
      wrap: true,
      render: (row) => (row.is_private
        ? el('span', { class: 'muted', text: 'Private. Open it to read.' })
        : el('span', { class: 'cell-preview', text: row.preview })),
    },
  ],
  searchLabel: 'Search name or request',
  emptyText: (state) => {
    if (state.q) return 'No prayer requests match this search. Private requests are not searched.';
    if (state.status) return 'No prayer requests have this status.';
    return 'No prayer requests have been sent yet.';
  },
  titleOf: (item) => (item.is_private ? 'Private prayer request' : `Prayer request from ${item.name}`),
  details: (item) => [
    { label: 'From', value: item.name },
    {
      label: 'Sharing',
      value: item.is_private
        // The Contact page promises a private request is seen only by the pastor and prayer leaders.
        ? tag('Private: only the pastor and prayer leaders', 'warning')
        : tag('Not marked private', 'neutral'),
    },
    { label: 'Received', value: formatDateTime(item.created_at) },
  ],
  textOf: (item) => item.request_text,
});
