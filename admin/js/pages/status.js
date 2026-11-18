/**
 * admin/js/pages/status.js: the Redis and Backups rows of the site status page.
 * The rest of this page is built in Phase 4 of the admin rebuild.
 */
import '../shell.js';
import { el } from '../components/dom.js';
import { api } from '../adminApi.js';
import { showLoading, showError } from '../components/states.js';
import { tag } from '../components/tag.js';

const redisBox = document.getElementById('redis-status');
const backupsBox = document.getElementById('backups-status');
const TONES = { ok: 'success', not_set_up: 'neutral', needs_attention: 'warning' };

function showRow(box, row, extra) {
  box.replaceChildren(el('div', { class: 'panel-body' },
    el('dl', { class: 'detail-list' },
      el('div', {}, el('dt', { text: 'Status' }), el('dd', {}, tag(row.label, TONES[row.status]))),
      el('div', {}, el('dt', { text: 'What this means' }), el('dd', { text: row.message }))),
    extra || null));
}

async function loadStatus() {
  showLoading(redisBox, 2);
  showLoading(backupsBox, 2);
  const result = await api.get('/admin/status');
  if (!result.ok) {
    showError(redisBox, result.message, loadStatus);
    backupsBox.replaceChildren();
    return;
  }
  showRow(redisBox, result.data.redis);
  if (result.data.backups) {
    showRow(backupsBox, result.data.backups,
      el('p', { class: 'status-link' }, el('a', { href: '/admin/backups.html', text: 'Open Backups' })));
  }
}

loadStatus();
