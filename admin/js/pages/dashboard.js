/**
 * admin/js/pages/dashboard.js: five counts, the newest unread messages and the
 * next events, from one request shared with the sidebar. The last backup line
 * comes from GET /api/admin/backups/summary.
 */
import { el, formatDate, formatDateTime } from '../components/dom.js';
import { showLoading, showEmpty, showError } from '../components/states.js';
import { loadStats, refreshCounts } from '../shell.js';
import { api } from '../adminApi.js';
import { KINDS, localDateTime, startDownload } from '../components/backupTools.js';

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

// ---------------------------------------------------------------------------
// The last backup, and a notice when none has been downloaded in 35 days
// ---------------------------------------------------------------------------
const backupBox = document.getElementById('dashboard-backup');

async function loadBackup() {
  const result = await api.get('/admin/backups/summary');
  if (!result.ok) {
    backupBox.replaceChildren(el('p', { class: 'muted', text: 'The backup information could not be loaded.' }));
    return;
  }
  const { latest, downloadNotice } = result.data;
  const link = el('a', { href: '/admin/backups.html', text: 'Backups' });
  const line = latest
    ? el('p', {}, `Last backup: ${localDateTime(latest.startedAt)}, ${(KINDS[latest.kind] || KINDS.manual).label.toLowerCase()}. `, link)
    : el('p', {}, 'No backup has been made yet. ', link);
  const items = [line];
  if (downloadNotice) {
    const problem = el('p', { class: 'field-error', role: 'alert', hidden: true });
    const action = latest && latest.fileAvailable
      ? el('button', {
        class: 'button button-secondary',
        type: 'button',
        text: 'Download the latest backup',
        onclick: async () => {
          problem.hidden = true;
          const started = await startDownload(latest.id);
          if (!started.ok) {
            problem.textContent = started.message;
            problem.hidden = false;
          } else {
            window.setTimeout(loadBackup, 2000);
          }
        },
      })
      : el('a', { class: 'button button-secondary', href: '/admin/backups.html', text: 'Go to Backups' });
    items.push(el('div', { class: 'banner banner-info', role: 'status' },
      el('span', { text: 'No backup has been downloaded to your device recently.' }), action), problem);
  }
  backupBox.replaceChildren(...items);
}

loadBackup();
