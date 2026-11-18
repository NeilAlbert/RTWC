/**
 * admin/js/pages/status.js: the Redis row of the site status page.
 * The rest of this page is built in Phase 4 of the admin rebuild.
 */
import '../shell.js';
import { el } from '../components/dom.js';
import { api } from '../adminApi.js';
import { showLoading, showError } from '../components/states.js';
import { tag } from '../components/tag.js';

const redisBox = document.getElementById('redis-status');
const TONES = { ok: 'success', not_set_up: 'neutral', needs_attention: 'warning' };

async function loadStatus() {
  showLoading(redisBox, 2);
  const result = await api.get('/admin/status');
  if (!result.ok) {
    showError(redisBox, result.message, loadStatus);
    return;
  }
  const { redis } = result.data;
  redisBox.replaceChildren(el('div', { class: 'panel-body' },
    el('dl', { class: 'detail-list' },
      el('div', {}, el('dt', { text: 'Status' }), el('dd', {}, tag(redis.label, TONES[redis.status]))),
      el('div', {}, el('dt', { text: 'What this means' }), el('dd', { text: redis.message })))));
}

loadStatus();
