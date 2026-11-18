/**
 * admin/js/pages/messages.js: messages sent through the Contact page.
 * Opening a new message marks it as read.
 */
import '../shell.js';
import { el, formatDateTime } from '../components/dom.js';
import { createInboxPage, emailLink } from '../components/inboxPage.js';

createInboxPage({
  root: document.getElementById('page-root'),
  endpoint: '/admin/contact',
  noun: 'message',
  nameOf: (row) => row.name,
  caption: 'Messages from the Contact page, newest first',
  statuses: [
    { value: 'new', label: 'New', tone: 'info' },
    { value: 'read', label: 'Read', tone: 'neutral' },
    { value: 'responded', label: 'Responded', tone: 'success' },
  ],
  columns: [
    // The email is the second line of this column, so the status fits beside the sidebar at 1024px.
    { label: 'Name and email', rowHeader: true, wrap: true, render: (row) => row.name, sub: (row) => row.email },
    { label: 'Message', wrap: true, render: (row) => el('span', { class: 'cell-preview', text: row.preview }) },
  ],
  searchLabel: 'Search name, email or message',
  emptyText: (state) => (state.q || state.status ? 'No messages match this search.' : 'No messages have been sent yet.'),
  titleOf: (item) => `Message from ${item.name}`,
  details: (item) => [
    { label: 'From', value: item.name },
    { label: 'Email', value: emailLink(item.email) },
    { label: 'Received', value: formatDateTime(item.created_at) },
  ],
  textOf: (item) => item.message,
  markReadOnOpen: true,
});
