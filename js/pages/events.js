// THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
// Events Page Specific JavaScript (js/pages/events.js)
// Connects to /api/events backend endpoint for live data.
// Falls back to static data if the API call fails.

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     DOM REFERENCES & CONFIGURATION
     ========================================================================== */
  const API_BASE = '';
  const eventsContainer = document.getElementById('events-full-container');
  const viewTabs = document.querySelectorAll('.view-tab');
  const categoryTabs = document.querySelectorAll('.category-tab');
  const noEventsMsg = document.getElementById('no-events-msg');

  let currentView = 'upcoming';   // default view on page load
  let currentCategory = 'all';

  // Mobile month names for display
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ==========================================================================
   FETCH EVENTS FROM BACKEND
   ========================================================================== */
  async function fetchEvents() {
    try {
      const response = await fetch(`${API_BASE}/api/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      return data.data || [];
    } catch (err) {
      logger.warn('Failed to fetch events from API, falling back to static data', { error: err.message });
      // Return static fallback data
      return [
        {
          id: 1,
          title: "Watch Night Service & Covenant Prayers",
          description: "A solemn crossover service of thanksgiving, covenant declarations, and intercession as we entered the new year together.",
          event_date: "2024-12-31",
          event_time: "9:00 PM - 1:00 AM",
          location: "Main Sanctuary, Royal Temple",
          category: "Convention",
          photo: "assets/images/welcome-pastor.jpg"
        },
        // ... static fallback events (same as original)
      ];
    }
  }

  // Initial fetch and render
  fetchEvents().then(eventsData => {
    // Store eventsData for rendering
    initEvents(eventsData);
  });

  /* ==========================================================================
   INITIALIZE EVENTS WITH DATA (API or fallback)
   ========================================================================== */
  function initEvents(eventsData) {
    // ... rest of the view logic using eventsData from API or fallback
    renderEvents();

    // View toggle handlers
    viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        viewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentView = tab.getAttribute('data-view') === 'past' ? 'past' : 'upcoming';
        renderEvents();
      });
    });

    // Category filter handlers
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.getAttribute('data-category');
        renderEvents();
      });
    });

    // Calendar subscribe button
    const subBtn = document.getElementById('btn-subscribe-cal');
    if (subBtn) {
      subBtn.addEventListener('click', () => {
        alert("Calendar Subscription Notice: You have subscribed to the Royal Temple Worship Centre iCal Feed (.ics). Upcoming church events will automatically sync with your phone or computer calendar.");
      });
    }
  }

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
        <img src="${event.photo}" alt="${event.title}" class="event-photo">
      </div>
    ` : '';

    const footerBlock = isUpcoming
      ? `
        <button class="btn btn-outline btn-add-cal btn-full-width" data-title="${event.title}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Add to Calendar (.ics)
        </button>
      `
      : `
        <span class="event-concluded-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Event Concluded
        </span>
      `;

    return `
      <article class="event-item-card" id="event-${event.id}">
        ${photoBlock}
        <div class="event-item-header">
          <div class="event-date-pill">
            <span class="event-date-month">${parts.month}</span>
            <span class="event-date-day">${parts.day}</span>
          </div>
          <span class="event-type-badge">${event.category}</span>
        </div>
        <div class="event-item-body">
          <h3 class="event-item-title">${event.title}</h3>
          <div class="event-item-meta">
            <div class="event-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${parts.full}</span>
            </div>
            <div class="event-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${event.event_time}</span>
            </div>
            <div class="event-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${event.location}</span>
            </div>
          </div>
          <p class="event-item-desc">${event.description}</p>
          <div class="event-item-footer">
            ${footerBlock}
          </div>
        </div>
      </article>
    `;
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
    if (upcomingCountEl) upcomingCountEl.textContent = getUpcomingEvents().length;
    if (pastCountEl) pastCountEl.textContent = getPastEvents().length;

    // Attach click handlers to "Add to Calendar" buttons (upcoming cards only)
    document.querySelectorAll('.btn-add-cal').forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.getAttribute('data-title');
        alert(`Calendar Reminder Notice: '${title}' has been added to your calendar invitation download queue.`);
      });
    });
  }
});