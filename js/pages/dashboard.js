// ADMIN DASHBOARD PAGE
// Fetches data from backend APIs and populates the dashboard UI.
// Connects to: /api/sermons, /api/events, /api/contact, /api/prayer-requests, /api/newsletter

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     CHECK AUTHENTICATION
     ========================================================================== */
  const { isAuthenticated, admin } = window.RTWCAuth.checkAuth((isAuth) => {
    if (!isAuth) {
      // Redirect to login if not authenticated
      window.location.href = 'login.html';
    }
  });

  if (!isAuthenticated) return;

  /* ==========================================================================
     DOM REFERENCES
     ========================================================================== */
  const statsGrid = document.querySelector('.stats-grid');
  const dashboardError = document.getElementById('dashboard-error');

  /* ==========================================================================
   FETCH ALL DASHBOARD DATA
   ========================================================================== */
  async function loadDashboardData() {
    try {
      // Fetch all needed data in parallel
      const [
        sermonsResponse,
        eventsResponse,
        contactMessagesResponse,
        prayerRequestsResponse,
        newsletterResponse
      ] = await Promise.all([
        // Sermons: total count
        fetch(`${API_BASE}/api/sermons?limit=1`, { headers: window.RTWCAuth.getAuthHeaders() })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch sermons');
            return res.json();
          }),

        // Events: upcoming count
        fetch(`${API_BASE}/api/events?upcoming=true`, { headers: window.RTWCAuth.getAuthHeaders() })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch events');
            return res.json();
          }),

        // Contact messages: unread count
        fetch(`${API_BASE}/api/contact?status=new`, { headers: window.RTWCAuth.getAuthHeaders() })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch contact messages');
            return res.json();
          }),

        // Prayer requests: new count
        fetch(`${API_BASE}/api/prayer-requests?status=new`, { headers: window.RTWCAuth.getAuthHeaders() })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch prayer requests');
            return res.json();
          }),

        // Newsletter subscribers count
        fetch(`${API_BASE}/api/newsletter`, { headers: window.RTWCAuth.getAuthHeaders() })
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch newsletter subscribers');
            return res.json();
          })
      ]);

      // Update DOM elements
      renderStats(sermsResponse, eventsResponse, contactMessagesResponse, prayerRequestsResponse, newsletterResponse);

    } catch (err) {
      logger.error('Failed to load dashboard data', { error: err.message });
      if (dashboardError) {
        dashboardError.textContent = 'Failed to load dashboard data. Please try again.';
        dashboardError.style.display = 'block';
      }
    }
  }

  /* ==========================================================================
   RENDER STATS CARDS
   ========================================================================== */
  function renderStats(sermsData, eventsData, contactData, prayerData, newsletterData) {
    // Sermons count - from metadata or default
    const sermonsCount = sermsData?.data?.length || 0;

    // Events count - upcoming
    const upcomingEventsCount = eventsData?.data?.length || 0;

    // Contact messages unread
    const unreadMessagesCount = contactData?.data?.length || 0;

    // Prayer requests new
    const newPrayerCount = prayerData?.data?.length || 0;

    // Newsletter subscribers
    const newsletterCount = newsletterData?.data?.length || 0;

    // Update stats DOM
    if (document.getElementById('stat-sermons')) {
      document.getElementById('stat-sermons').querySelector('.stat-value').textContent = sermonsCount;
    }
    if (document.getElementById('stat-events')) {
      document.getElementById('stat-events').querySelector('.stat-value').textContent = upcomingEventsCount;
    }
    if (document.getElementById('stat-messages')) {
      document.getElementById('stat-messages').querySelector('.stat-value').textContent = unreadMessagesCount;
    }
    if (document.getElementById('stat-prayers')) {
      document.getElementById('stat-prayers').querySelector('.stat-value').textContent = newPrayerCount;
    }
    if (document.getElementById('stat-newsletter')) {
      document.getElementById('stat-newsletter').querySelector('.stat-value').textContent = newsletterCount;
    }
  }

  /* ==========================================================================
   INITIALIZE
   ========================================================================== */
  loadDashboardData();

  // Listen for auth events
  window.addEventListener('rtwc:logout', () => {
    window.location.href = 'login.html';
  });
});