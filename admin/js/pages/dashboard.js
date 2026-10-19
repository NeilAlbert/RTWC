/**
 * =============================================================================
 * admin/js/pages/dashboard.js — overview/landing page.
 *
 * Loads live counts and recent content from the existing admin APIs.
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
    testimonies: document.getElementById('stat-testimonies'),
    gallery: document.getElementById('stat-gallery'),
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

  function renderList(id, items, emptyMessage, getTitle, getDetail) {
    const container = document.getElementById(id);
    if (!container) return;
    container.replaceChildren();

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = emptyMessage;
      container.append(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'dashboard-list-item';
      const title = document.createElement('h3');
      title.textContent = getTitle(item) || 'Untitled';
      const detail = document.createElement('p');
      detail.textContent = getDetail(item) || '';
      row.append(title, detail);
      container.append(row);
    });
  }

  function formatDate(value) {
    if (!value) return 'Date unavailable';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }

  async function loadDashboard() {
    try {
      const [sermonsResponse, eventsResponse, messagesResponse, prayersResponse, testimoniesResponse, galleryResponse] = await Promise.all([
        AdminApi.get('/sermons?page=1&limit=1'),
        AdminApi.get('/events?upcoming=true'),
        AdminApi.get('/contact?status=new&page=1&limit=5'),
        AdminApi.get('/prayer-requests?status=new&page=1&limit=5'),
        AdminApi.get('/testimonies?status=pending&page=1&limit=5'),
        AdminApi.get('/facebook/photos'),
      ]);

      const sermons = sermonsResponse.data?.items || [];
      const messages = messagesResponse.data?.items || [];
      const prayers = prayersResponse.data?.items || [];
      const testimonies = testimoniesResponse.data?.items || [];
      const events = eventsResponse.data || [];
      const photos = galleryResponse.data?.photos || [];

      setValue('sermons', sermonsResponse.data?.pagination?.total ?? 0);
      setValue('events', events.length);
      setValue('messages', messagesResponse.data?.pagination?.total ?? 0);
      setValue('prayers', prayersResponse.data?.pagination?.total ?? 0);
      setValue('testimonies', testimoniesResponse.data?.pagination?.total ?? 0);
      setValue('gallery', photos.length);

      renderList('recent-messages', messages, 'No new contact messages.',
        (item) => item.subject || item.name,
        (item) => `${item.email || 'No email'} · ${item.message || ''}`);
      renderList('recent-prayers', prayers, 'No new prayer requests.',
        (item) => item.name || 'Anonymous request',
        (item) => `${formatDate(item.created_at)} · ${item.request_text || ''}`);
      renderList('recent-testimonies', testimonies, 'No testimonies awaiting review.',
        (item) => item.name,
        (item) => `${formatDate(item.created_at)} · ${item.testimony || ''}`);
      renderList('upcoming-events', events.slice(0, 5), 'No upcoming events.',
        (item) => item.title,
        (item) => `${formatDate(item.event_date)} · ${item.event_time || 'Time not set'} · ${item.location || 'Location not set'}`);
      renderList('latest-sermons', sermons, 'No sermons have been added.',
        (item) => item.title,
        (item) => `${item.speaker || 'Speaker not set'} · ${formatDate(item.sermon_date)}`);
    } catch (err) {
      // Never fail silently — show a visible error banner.
      const banner = document.getElementById('dashboard-error');
      if (banner) {
        banner.textContent = 'Dashboard information could not be loaded. Please refresh and try again.';
        banner.classList.add('visible');
      }
      Object.keys(valueEls).forEach((key) => setValue(key, '—'));
    }
  }

  loadDashboard();
});
