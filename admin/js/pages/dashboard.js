/**
 * admin/js/pages/dashboard.js: five counts, the newest unread messages and the
 * next events. All of it comes from one request, shared with the sidebar.
 */
import { el, formatDate, formatDateTime } from '../components/dom.js';
import { showLoading, showEmpty, showError } from '../components/states.js';
import { loadStats, refreshCounts } from '../shell.js';

const errorBox = document.getElementById('dashboard-error');
const messagesBox = document.getElementById('new-messages');
const eventsBox = document.getElementById('upcoming-events');

function showMessages(messages) {
  if (messages.length === 0) {
    showEmpty(messagesBox, 'There are no new messages.');
    return;
  }
  messagesBox.replaceChildren(el('ul', { class: 'item-list' }, messages.map((message) => el('li', {},
    el('a', { class: 'item-title', href: `/admin/messages.html?id=${encodeURIComponent(message.id)}`, text: message.name }),
    el('p', { class: 'item-meta', text: formatDateTime(message.created_at) }),
    el('p', { class: 'item-preview', text: message.preview })))));
}

function showEvents(events) {
  if (events.length === 0) {
    showEmpty(eventsBox, 'There are no upcoming events.', { label: 'Add an event', href: '/admin/events.html' });
    return;
  }
  eventsBox.replaceChildren(el('ul', { class: 'item-list' }, events.map((event) => el('li', {},
    el('p', { class: 'item-title', text: event.title }),
    el('p', { class: 'item-meta', text: [formatDate(event.event_date), event.event_time, event.location].filter(Boolean).join(', ') })))));
}

async function load(request) {
  errorBox.replaceChildren();
  showLoading(messagesBox, 3);
  showLoading(eventsBox, 3);

  const result = await request;
  if (!result.ok) {
    showError(errorBox, result.message, () => load(refreshCounts()));
    messagesBox.replaceChildren();
    eventsBox.replaceChildren();
    return;
  }

  const stats = result.data;
  document.querySelectorAll('[data-stat]').forEach((node) => {
    node.textContent = String(Number(stats[node.dataset.stat]) || 0);
  });
  showMessages(stats.recentMessages || []);
  showEvents(stats.nextEvents || []);
}

load(loadStats());
