// BACKEND REMOVED — see upcoming events previously referenced for /api/events/upcoming. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Home Page Specific JavaScript (js/pages/index.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     STATIC LOCAL UPCOMING EVENTS DATA
     ========================================================================== */
  const upcomingEventsData = [
    {
      id: 1,
      title: "Mid-Year Spiritual Awakening Revival",
      month: "AUG",
      day: "14",
      time: "6:30 PM - 9:00 PM",
      location: "Main Sanctuary, RTWC",
      category: "Revival",
      description: "Join us for 3 nights of power-packed prayers, prophetic worship, and supernatural breakthroughs under the theme 'Overcoming by the Word'."
    },
    {
      id: 2,
      title: "Annual National Youth Conference 2026",
      month: "AUG",
      day: "28",
      time: "9:00 AM - 4:00 PM",
      location: "Royal Temple Auditorium & Online",
      category: "Convention",
      description: "A monumental gathering of young believers across the district seeking empowerment for kingdom influence, leadership, and divine impact."
    },
    {
      id: 3,
      title: "Covenant Praise & Thanksgiving Service",
      month: "SEP",
      day: "06",
      time: "8:00 AM - 11:30 AM",
      location: "Main Sanctuary, RTWC",
      category: "Special Service",
      description: "A glorious Sunday of high praise, testimonies, and joyful sacrifice as we celebrate God's unwavering faithfulness and covenant blessings."
    }
  ];

  // Render Upcoming Events Cards into container
  const eventsContainer = document.getElementById('upcoming-events-container');

  if (eventsContainer) {
    eventsContainer.innerHTML = upcomingEventsData.map(event => `
      <article class="event-preview-card">
        <div class="event-card-header">
          <div class="event-date-badge">
            <span class="event-date-month">${event.month}</span>
            <span class="event-date-day">${event.day}</span>
          </div>
          <div>
            <span class="event-card-category">${event.category}</span>
          </div>
        </div>
        <div class="event-card-body">
          <h3 class="event-card-title">${event.title}</h3>
          <div class="event-card-meta">
            <div class="event-meta-line">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${event.time}</span>
            </div>
            <div class="event-meta-line">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${event.location}</span>
            </div>
          </div>
          <p class="event-card-desc">${event.description}</p>
          <a href="events.html#event-${event.id}" class="btn btn-outline-gold" style="width:100%; padding:0.6rem;">Event Details & Calendar</a>
        </div>
      </article>
    `).join('');
  }

  // Featured Sermon Overlay Play Handler
  const playOverlayBtn = document.querySelector('.play-overlay-btn');
  if (playOverlayBtn) {
    playOverlayBtn.addEventListener('click', () => {
      window.location.href = 'live.html';
    });
  }
});
