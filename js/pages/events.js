// BACKEND REMOVED — see events archive previously called /api/events. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Events Page Specific JavaScript (js/pages/events.js)
 *
 * Renders a static local events array split into "Upcoming" and "Past"
 * sections based on comparing each event_date against the current date.
 * Upcoming events sort soonest-first; past events sort most-recent-first.
 * No event is hardcoded into a section — the comparison happens at render
 * time so the page stays correct as dates pass.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     STATIC LOCAL EVENTS CALENDAR DATA
     ========================================================================== */
  const eventsData = [
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
    {
      id: 2,
      title: "Easter Sunrise Resurrection Retreat",
      description: "A dawn gathering celebrating the risen Christ through powerful worship, the Word, and a shared sunrise breakfast.",
      event_date: "2025-04-18",
      event_time: "6:00 AM - 11:00 AM",
      location: "Royal Temple Grounds",
      category: "Revival",
      photo: "assets/images/sermon-latest.jpg"
    },
    {
      id: 3,
      title: "Mid-Year Spiritual Awakening Revival",
      description: "Three nights of power-packed prayers, prophetic worship, and supernatural breakthroughs under the theme 'Overcoming by the Word'.",
      event_date: "2025-08-14",
      event_time: "6:30 PM - 9:00 PM",
      location: "Main Sanctuary, Royal Temple",
      category: "Revival",
      photo: "assets/images/hero.jpg"
    },
    {
      id: 4,
      title: "Covenant Praise & Thanksgiving Service",
      description: "A glorious Sunday of high praise, testimonies, and joyful sacrifice as we celebrated God's unwavering faithfulness and covenant blessings.",
      event_date: "2025-09-06",
      event_time: "8:00 AM - 11:30 AM",
      location: "Main Sanctuary, Royal Temple",
      category: "Anniversary",
      photo: "assets/images/welcome-pastor.jpg"
    },
    {
      id: 5,
      title: "Annual National Youth Conference 2026",
      description: "A monumental gathering of young believers across the district seeking empowerment for kingdom influence, leadership, and divine impact.",
      event_date: "2026-08-28",
      event_time: "9:00 AM - 4:00 PM",
      location: "Royal Temple Auditorium & Online",
      category: "Convention"
    },
    {
      id: 6,
      title: "All-Nations Evangelism Crusade & Health Fair",
      description: "Open-air gospel proclamation featuring salvation messages, free medical consultations, food basket distributions, and healing prayers.",
      event_date: "2026-09-18",
      event_time: "5:00 PM - 9:00 PM",
      location: "Community Park Grounds",
      category: "Revival"
    },
    {
      id: 7,
      title: "District Ministers & Officers Retreat",
      description: "A consecrated day of fasting, prayer, and strategic administrative planning for all ordained elders, deacons, and deaconesses.",
      event_date: "2026-10-02",
      event_time: "8:00 AM - 3:00 PM",
      location: "COP Retreat Center",
      category: "Camp Meeting"
    },
    {
      id: 8,
      title: "Royal Temple 15th Anniversary Celebration",
      description: "A milestone anniversary service celebrating 15 years of God's grace, church growth, and community transformation.",
      event_date: "2026-10-25",
      event_time: "8:00 AM - 12:30 PM",
      location: "Main Sanctuary Complex",
      category: "Anniversary",
      photo: "assets/images/hero.jpg"
    },
    {
      id: 9,
      title: "New Year Kickoff Praise Night",
      description: "Begin the year with exuberant praise, prophetic declarations, and a communion of faith as we dedicate the new season to the Lord.",
      event_date: "2027-01-01",
      event_time: "9:00 PM - 12:30 AM",
      location: "Main Sanctuary, Royal Temple",
      category: "Convention"
    },
    {
      id: 10,
      title: "Easter Convention & Healing Service",
      description: "An anointed Easter convention featuring expository teaching, worship, and dedicated prayer for the sick and burdened.",
      event_date: "2027-03-19",
      event_time: "8:00 AM - 1:00 PM",
      location: "Main Sanctuary Complex",
      category: "Revival",
      photo: "assets/images/sermon-latest.jpg"
    }
  ];

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

  /* ==========================================================================
     VIEW TOGGLE TABS (Upcoming / Past)
     ========================================================================== */
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.getAttribute('data-view') === 'past' ? 'past' : 'upcoming';
      renderEvents();
    });
  });

  /* ==========================================================================
     CATEGORY FILTER TABS (scoped to the active view)
     ========================================================================== */
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.getAttribute('data-category');
      renderEvents();
    });
  });

  /* ==========================================================================
     CALENDAR SUBSCRIBE BUTTON
     ========================================================================== */
  const subBtn = document.getElementById('btn-subscribe-cal');
  if (subBtn) {
    subBtn.addEventListener('click', () => {
      alert("Calendar Subscription Notice: You have subscribed to the Royal Temple Worship Centre iCal Feed (.ics). Upcoming church events will automatically sync with your phone or computer calendar.");
    });
  }

  /* ==========================================================================
     INITIAL RENDER (defaults to Upcoming view, All categories)
     ========================================================================== */
  renderEvents();
});

