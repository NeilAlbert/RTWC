// THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
// Ministries Page Specific JavaScript (js/pages/ministries.js)
// Connects to /api/ministries backend endpoint for live data.
// Falls back to static data if the API call fails.

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     DOM REFERENCES & CONFIGURATION
     ========================================================================== */
  const API_BASE = '';
  const ministriesGrid = document.querySelector('.ministries-grid');
  const noResultsMsg = document.getElementById('no-ministries-msg');

  /* ==========================================================================
   FETCH MINISTRIES FROM BACKEND
   ========================================================================== */
  async function fetchMinistries() {
    try {
      const response = await fetch(`${API_BASE}/api/ministries`);
      if (!response.ok) throw new Error('Failed to fetch ministries');
      const data = await response.json();
      return data.data || [];
    } catch (err) {
      logger.warn('Failed to fetch ministries from API, falling back to static data', { error: err.message });
      // Return static fallback data
      return [
        {
          id: 1,
          name: "Men's Ministry (PEMEM)",
          tag: "PEMEM",
          summary: "Building godly men, faithful husbands, exemplary fathers, and visionary kingdom leaders.",
          leader: "Elder Kwame Asante",
          meetingTime: "1st & 3rd Saturday @ 7:00 AM",
          photo: "assets/images/hero.jpg"
        },
        // ... static fallback ministries
      ];
    }
  }

  /* ==========================================================================
   INITIALIZE MINISTRIES WITH DATA (API or fallback)
   ========================================================================== */
  fetchMinistries().then(ministriesData => {
    initMinistries(ministriesData);
  });

  function initMinistries(ministriesData) {
    renderMinistries(ministriesData);

    // Expandable Ministry Details Handler
    const expandBtns = document.querySelectorAll('.btn-expand-ministry');
    expandBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.ministry-card');
        const isExpanded = card.classList.contains('expanded');

        if (!isExpanded) {
          card.classList.add('expanded');
          btn.setAttribute('aria-expanded', 'true');
          btn.querySelector('span').textContent = 'Hide Details';
        } else {
          card.classList.remove('expanded');
          btn.setAttribute('aria-expanded', 'false');
          btn.querySelector('span').textContent = 'Learn More Details';
        }
      });
    });
  }

  /* ==========================================================================
   RENDER MINISTRIES GRID
   ========================================================================== */
  function renderMinistries(items) {
    if (!ministriesGrid) return;

    if (items.length === 0) {
      ministriesGrid.innerHTML = '';
      if (noResultsMsg) noResultsMsg.style.display = 'block';
      return;
    }

    if (noResultsMsg) noResultsMsg.style.display = 'none';

    ministriesGrid.innerHTML = items.map(ministry => `
      <article class="ministry-card" id="ministry-${window.escapeHtml(ministry.id)}">
        <div class="ministry-card-header">
          <div class="ministry-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div class="ministry-title-box">
            <span class="ministry-tag">${window.escapeHtml(ministry.tag || ministry.slug || 'Ministry')}</span>
            <h3 class="ministry-name">${window.escapeHtml(ministry.name)}</h3>
          </div>
        </div>
        <p class="ministry-summary">${window.escapeHtml(ministry.summary || ministry.description)}</p>
        <button class="btn-expand-ministry" aria-expanded="false">
          <span>Learn More Details</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="ministry-details">
          <p>${window.escapeHtml(ministry.details || ministry.description || 'More information is not available yet.')}</p>
          <div class="ministry-meta">
            <strong>Meeting Time:</strong> ${window.escapeHtml(ministry.meetingTime || ministry.meeting_information || 'Not provided')}<br>
            <strong>Leader:</strong> ${window.escapeHtml(ministry.leader || ministry.leader_name || 'Not listed')}
          </div>
        </div>
      </article>
    `).join('');

    // Re-attach expand listeners to newly rendered buttons
    const newExpandBtns = document.querySelectorAll('.btn-expand-ministry');
    newExpandBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.ministry-card');
        const isExpanded = card.classList.contains('expanded');

        if (!isExpanded) {
          card.classList.add('expanded');
          btn.setAttribute('aria-expanded', 'true');
          btn.querySelector('span').textContent = 'Hide Details';
        } else {
          card.classList.remove('expanded');
          btn.setAttribute('aria-expanded', 'false');
          btn.querySelector('span').textContent = 'Learn More Details';
        }
      });
    });
  }
});
