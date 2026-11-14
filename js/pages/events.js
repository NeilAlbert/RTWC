/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Events Page Specific JavaScript (js/pages/events.js)
 *
 * Renders events returned by the public events API, split into "Upcoming" and "Past"
 * sections based on comparing each event_date against the current date.
 * Upcoming events sort soonest-first; past events sort most-recent-first.
 * No event is hardcoded into a section — the comparison happens at render
 * time so the page stays correct as dates pass.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     EVENTS API DATA
     ========================================================================== */
  let eventsData = [];

  /* ==========================================================================
     DOM REFERENCES
     ========================================================================== */
  const eventsContainer = document.getElementById('events-full-container');
  const viewTabs = document.querySelectorAll('.view-tab');
  const categoryTabs = document.querySelectorAll('.category-tab');

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let currentView = 'upcoming';   // default view on page load
  let currentCategory = 'all';

  /* ==========================================================================
     DATE HELPERS
     ========================================================================== */
  function parseDate(dateStr) {
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  function getDateParts(dateStr) {
    const d = parseDate(dateStr);
    return {
      month: monthNames[d.getMonth()],
      day: String(d.getDate()).padStart(2, '0'),
      full: `${weekdayNames[d.getDay()]}, ${fullMonthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    };
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function getEventCalendarTimes(event) {
    const [year, month, day] = event.event_date.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day));
    const timeMatches = [...String(event.event_time || '').matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)];

    if (timeMatches.length === 0) {
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end, allDay: true };
    }

    const toMinutes = match => {
      const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
      return hour * 60 + Number(match[2] || 0);
    };

    const startMinutes = toMinutes(timeMatches[0]);
    start.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60);

    const end = new Date(start);
    if (timeMatches.length > 1) {
      const endMinutes = toMinutes(timeMatches[1]);
      end.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60);
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
    } else {
      end.setUTCHours(end.getUTCHours() + 1);
    }

    return { start, end, allDay: false };
  }

  function formatGoogleCalendarDate(date) {
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}00Z`;
  }

  function createGoogleCalendarUrl(event) {
    const { start, end, allDay } = getEventCalendarTimes(event);
    const formatDate = date => `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
    const parameters = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: allDay
        ? `${formatDate(start)}/${formatDate(end)}`
        : `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
      details: event.description || '',
      location: event.location || ''
    });
    return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
  }

  function setCalendarStatus(message) {
    const status = document.getElementById('calendar-sync-status');
    if (status) status.textContent = message;
  }

  function configureCalendarSubscription() {
    const subscribeLink = document.getElementById('btn-subscribe-cal');
    const feedUrlInput = document.getElementById('calendar-feed-url');
    if (!subscribeLink || !feedUrlInput) return;

    if (!['http:', 'https:'].includes(window.location.protocol)) {
      subscribeLink.removeAttribute('href');
      subscribeLink.setAttribute('aria-disabled', 'true');
      subscribeLink.tabIndex = -1;
      document.getElementById('btn-copy-calendar-url').disabled = true;
      feedUrlInput.value = '';
      setCalendarStatus('Calendar sync requires the published website and its events API.');
      return;
    }

    const feedUrl = new URL('/api/events/calendar.ics', window.location.origin);
    feedUrlInput.value = feedUrl.href;
    subscribeLink.href = feedUrl.href.replace(/^https?:/, 'webcal:');

    if (window.location.protocol !== 'https:') {
      setCalendarStatus('Calendar apps require the published HTTPS site to subscribe and refresh this feed.');
    }
  }

  /* ==========================================================================
     VIEW SOURCING & SORTING (dynamic — never hardcoded)
     ========================================================================== */
  function getUpcomingEvents() {
    const today = startOfToday();
    return eventsData
      .filter(event => parseDate(event.event_date) >= today)
      .sort((a, b) => parseDate(a.event_date) - parseDate(b.event_date));
  }

  function getPastEvents() {
    const today = startOfToday();
    return eventsData
      .filter(event => parseDate(event.event_date) < today)
      .sort((a, b) => parseDate(b.event_date) - parseDate(a.event_date));
  }

  /* ==========================================================================
     CARD RENDERING
     ========================================================================== */
  function renderEventCard(event) {
    const parts = getDateParts(event.event_date);
    const isUpcoming = currentView === 'upcoming';

    // Small photo recap strip for past events when a photo is available.
    const photoBlock = (event.photo && !isUpcoming) ? `
      <div class="event-photo-box">
        <img src="${escapeHTML(event.photo)}" alt="${escapeHTML(event.title)}" class="event-photo">
      </div>
    ` : '';

    const footerBlock = isUpcoming
      ? `
        <a class="btn btn-outline btn-add-cal btn-full-width" href="${createGoogleCalendarUrl(event)}" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Add to Google Calendar
        </a>
      `
      : `
        <span class="event-concluded-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Event Concluded
        </span>
      `;

    return `
      <article class="event-item-card" id="event-${escapeHTML(event.id)}">
        ${photoBlock}
        <div class="event-item-header">
          <div class="event-date-pill">
            <span class="event-date-month">${parts.month}</span>
            <span class="event-date-day">${parts.day}</span>
          </div>
          <span class="event-type-badge">${escapeHTML(event.category)}</span>
        </div>
        <div class="event-item-body">
          <h3 class="event-item-title">${escapeHTML(event.title)}</h3>
          <div class="event-item-meta">
            <div class="event-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${parts.full}</span>
            </div>
            <div class="event-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${escapeHTML(event.event_time || 'Time to be announced')}</span>
            </div>
            <div class="event-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${escapeHTML(event.location || 'Location to be announced')}</span>
            </div>
          </div>
          <p class="event-item-desc">${escapeHTML(event.description || '')}</p>
          <div class="event-item-footer">
            ${footerBlock}
          </div>
        </div>
      </article>
    `;
  }

  // Update a tab's count badge; the badge "pops" only when the number changes.
  function setCount(element, count) {
    if (!element) return;
    const next = String(count);
    if (element.textContent === next) return;
    element.textContent = next;
    element.classList.remove('is-updated');
    void element.offsetWidth;
    element.classList.add('is-updated');
  }

  // Keep the pressed state of a tab group in sync for assistive technology.
  function setActiveTab(tabs, activeTab) {
    tabs.forEach(tab => {
      const isActive = tab === activeTab;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-pressed', String(isActive));
    });
  }

  function renderEvents() {
    if (!eventsContainer) return;

    const sourceEvents = currentView === 'upcoming' ? getUpcomingEvents() : getPastEvents();
    const filtered = currentCategory === 'all'
      ? sourceEvents
      : sourceEvents.filter(event => event.category.toLowerCase() === currentCategory.toLowerCase());

    // Update section heading & subtitle for the active view
    const viewTitle = document.getElementById('events-view-title');
    const viewSubtitle = document.getElementById('events-view-subtitle');
    if (viewTitle) {
      viewTitle.textContent = currentView === 'upcoming' ? 'Upcoming Events' : 'Past Events';
    }
    if (viewSubtitle) {
      viewSubtitle.textContent = currentView === 'upcoming'
        ? 'Events scheduled for the coming weeks and months.'
        : 'Recaps of gatherings we have already held together.';
    }

    eventsContainer.removeAttribute('aria-busy');

    const noEventsMsg = document.getElementById('no-events-msg');
    if (filtered.length === 0) {
      eventsContainer.innerHTML = '';
      if (noEventsMsg) noEventsMsg.style.display = 'block';
    } else {
      eventsContainer.innerHTML = filtered.map(renderEventCard).join('');
      if (noEventsMsg) noEventsMsg.style.display = 'none';
    }

    // Live badge counts for each view (independent of the active category filter)
    const upcomingCountEl = document.getElementById('count-upcoming');
    const pastCountEl = document.getElementById('count-past');
    setCount(upcomingCountEl, getUpcomingEvents().length);
    setCount(pastCountEl, getPastEvents().length);

  }

  /* ==========================================================================
     VIEW TOGGLE TABS (Upcoming / Past)
     ========================================================================== */
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveTab(viewTabs, tab);
      currentView = tab.getAttribute('data-view') === 'past' ? 'past' : 'upcoming';
      renderEvents();
    });
  });

  /* ==========================================================================
     CATEGORY FILTER TABS (scoped to the active view)
     ========================================================================== */
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveTab(categoryTabs, tab);
      currentCategory = tab.getAttribute('data-category');
      renderEvents();
    });
  });

  /* ==========================================================================
     CALENDAR SUBSCRIBE BUTTON
     ========================================================================== */
  [viewTabs, categoryTabs].forEach(tabs => {
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.classList.contains('active'))));
  });

  configureCalendarSubscription();

  const copyFeedButton = document.getElementById('btn-copy-calendar-url');
  const feedUrlInput = document.getElementById('calendar-feed-url');
  copyFeedButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(feedUrlInput.value);
      setCalendarStatus('Calendar feed link copied. Paste it into your calendar app’s “Subscribe by URL” option.');
    } catch (error) {
      console.error('Unable to copy the calendar feed link.', error);
      feedUrlInput.select();
      setCalendarStatus('Could not copy automatically. Select the feed link above and copy it into your calendar app.');
    }
  });

  /* ==========================================================================
     LOAD EVENTS (shared API source for event cards and calendar feed)
     ========================================================================== */
  async function loadEvents() {
    try {
      const response = await fetch('/api/events', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Events API returned HTTP ${response.status}.`);

      const payload = await response.json();
      if (!payload.success || !Array.isArray(payload.data)) {
        throw new Error('Events API returned an invalid response.');
      }

      eventsData = payload.data;
      renderEvents();
    } catch (error) {
      console.error('Unable to load events from the events API.', error);
      eventsContainer.replaceChildren();
      eventsContainer.removeAttribute('aria-busy');
      const noEventsMessage = document.getElementById('no-events-msg');
      if (noEventsMessage) noEventsMessage.style.display = 'none';
      const loadError = document.getElementById('events-load-error');
      if (loadError) {
        loadError.textContent = 'Events could not be loaded right now. Please try again later.';
        loadError.hidden = false;
      }
    }
  }

  loadEvents();
});
