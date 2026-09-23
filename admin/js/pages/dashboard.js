/**
 * =============================================================================
 * admin/js/pages/dashboard.js — overview/landing page.
 *
 * Loads counts: total sermons, upcoming events, unread contact messages,
 * new prayer requests, newsletter subscribers.
 * =============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAuth.checkAuth()) return;

  AdminAuth.initShell('dashboard', 'Dashboard'); // initShell wires the 401 handler

  const cards = {
    sermons: document.getElementById('stat-sermons'),
    events: document.getElementById('stat-events'),
    messages: document.getElementById('stat-messages'),
    prayers: document.getElementById('stat-prayers'),
    newsletter: document.getElementById('stat-newsletter'),
  };

  // Grab the numeric value span inside each card.
  const valueEls = {};
  Object.keys(cards).forEach((key) => {
    const el = cards[key];
    if (el) valueEls[key] = el.querySelector('.stat-value');
  });

  function setValue(key, text, note) {
    if (valueEls[key]) valueEls[key].textContent = text;
    if (note && cards[key]) {
      const noteEl = cards[key].querySelector('.stat-note');
      if (noteEl) noteEl.textContent = note;
    }
  }

  async function loadStats() {
    try {
      const [sermons, events, messages, prayers, newsletter] = await Promise.all([
        AdminApi.get('/sermons?page=1&limit=1'),
        AdminApi.get('/events?upcoming=true'),
        AdminApi.get('/contact?status=new&page=1&limit=1'),
        AdminApi.get('/prayer-requests?status=new&page=1&limit=1'),
        AdminApi.get('/newsletter/subscribers?page=1&limit=1'),
      ]);

      setValue('sermons', sermons.data.pagination.total ?? 0);
      setValue('events', events.data.length ?? 0);
      setValue('messages', messages.data.pagination.total ?? 0);
      setValue('prayers', prayers.data.pagination.total ?? 0);
      setValue('newsletter', newsletter.data.pagination.total ?? 0);
    } catch (err) {
      // Never fail silently — show a visible error banner.
      const banner = document.getElementById('dashboard-error');
      if (banner) {
        banner.textContent = `Failed to load dashboard counts: ${err.message}`;
        banner.classList.add('visible');
      }
      Object.keys(valueEls).forEach((key) => setValue(key, '—'));
    }
  }

  loadStats();
});
