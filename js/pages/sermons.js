// THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
// Sermons Page Specific JavaScript (js/pages/sermons.js)
// Connects to /api/sermons backend endpoint with filtering, pagination, and modal playback.
// Falls back to static data if API call fails.

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     DOM REFERENCES & CONFIGURATION
     ========================================================================== */
  const API_BASE = '';
  const container = document.getElementById('sermons-container');
  const searchInput = document.getElementById('search-input');
  const speakerSelect = document.getElementById('speaker-select');
  const seriesSelect = document.getElementById('series-select');
  const noResultsMsg = document.getElementById('no-results-msg');

  const modal = document.getElementById('sermon-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalSermonTitle = document.getElementById('modal-sermon-title');
  const modalSermonMeta = document.getElementById('modal-sermon-meta');
  const modalTitleDisplay = document.getElementById('modal-title-display');
  const modalDescDisplay = document.getElementById('modal-desc-display');

  /* ==========================================================================
   FETCH SERMONS FROM BACKEND
   ========================================================================== */
  async function fetchSermons() {
    try {
      const response = await fetch(`${API_BASE}/api/sermons`);
      if (!response.ok) throw new Error('Failed to fetch sermons');
      const data = await response.json();
      return Array.isArray(data.data) ? data.data : (data.data?.items || []);
    } catch (err) {
      logger.warn('Failed to fetch sermons from API, falling back to static data', { error: err.message });
      // Return static fallback data
      return [
        {
          id: 1,
          title: "Walking in Divine Purpose & Dominion",
          speaker: "Pastor Emmanuel K. Ofori",
          sermon_date: "July 26, 2026",
          date: "July 26, 2026",
          category: "Sunday Worship",
          thumbnail_url: "assets/images/sermon-latest.jpg",
          thumbnail: "assets/images/sermon-latest.jpg",
          video_url: "https://www.facebook.com/cop.rtwc/videos",
          description: "Discover how to align your daily walk with God's sovereign blueprint.",
          summary: "Discover how to align your daily walk with God's sovereign blueprint."
        },
        // ... static fallback sermons
      ];
    }
  }

  // Initial fetch and render
  fetchSermons().then(sermonsData => {
    initSermons(sermonsData);
  });

  /* ==========================================================================
   INITIALIZE SERMONS WITH DATA (API or fallback)
   ========================================================================== */
  function initSermons(sermonsData) {
    // Render initial sermons
    renderSermons(sermonsData);

    // Filter handlers
    if (searchInput) searchInput.addEventListener('input', filterSermons);
    if (speakerSelect) speakerSelect.addEventListener('change', filterSermons);
    if (seriesSelect) seriesSelect.addEventListener('change', filterSermons);

    // Modal handlers
    function openSermonModal(sermon) {
      modalSermonTitle.textContent = sermon.title;
      modalSermonMeta.textContent = `${sermon.speaker || ''} | ${sermon.date || sermon.sermon_date || ''}`;
      modalTitleDisplay.textContent = sermon.title;
      modalDescDisplay.textContent = sermon.summary || sermon.description || '';

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    // Attach click listeners to play buttons (re-attached after render)
    document.querySelectorAll('.sermon-play-overlay, .btn-play-sermon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.getAttribute('data-id'));
        const sermon = sermonsData.find(s => s.id === id);
        if (sermon) {
          openSermonModal(sermon);
        }
      });
    });
  }

  /* ==========================================================================
   FILTER HANDLER
   ========================================================================== */
  function filterSermons() {
    const query = searchInput.value.toLowerCase().trim();
    const speaker = speakerSelect.value;
    const category = seriesSelect.value;

    const filtered = sermonsData.filter(item => {
      const matchesQuery = String(item.title || '').toLowerCase().includes(query) ||
        String(item.summary || item.description || '').toLowerCase().includes(query) ||
        String(item.speaker || '').toLowerCase().includes(query);
      const matchesSpeaker = speaker === 'all' || item.speaker === speaker;
      const matchesCategory = category === 'all' || item.category === category;

      return matchesQuery && matchesSpeaker && matchesCategory;
    });

    renderSermons(filtered);
  }

  /* ==========================================================================
   RENDER SERMONS LIST
   ========================================================================== */
  function renderSermons(items) {
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '';
      noResultsMsg.style.display = 'block';
      return;
    }

    noResultsMsg.style.display = 'none';

    container.innerHTML = items.map(item => `
      <article class="sermon-card">
        <div class="sermon-thumb-box">
          <img src="${window.escapeHtml(window.safePublicUrl(item.thumbnail_url || item.thumbnail) || 'assets/images/sermon-latest.jpg')}" alt="${window.escapeHtml(item.title)}" class="sermon-thumb-img" loading="lazy">
          <span class="sermon-category-tag">${window.escapeHtml(item.category || 'Sermon')}</span>
          <button class="sermon-play-overlay" data-id="${window.escapeHtml(item.id)}" aria-label="Play ${window.escapeHtml(item.title)}">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="sermon-card-body">
            <h3 class="sermon-card-title">${window.escapeHtml(item.title)}</h3>
          <div class="sermon-card-meta">
            <div class="sermon-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>${window.escapeHtml(item.speaker)}</span>
            </div>
            <div class="sermon-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${window.escapeHtml(item.date || item.sermon_date)}</span>
            </div>
          </div>
          <p class="sermon-card-desc">${window.escapeHtml(item.summary || item.description)}</p>
          <div class="sermon-card-actions">
            <button class="btn btn-primary btn-play-sermon btn-full-width" data-id="${window.escapeHtml(item.id)}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Watch / Listen Message
            </button>
          </div>
        </div>
      </article>
    `).join('');

    // Re-attach click listeners to newly rendered play buttons
    document.querySelectorAll('.sermon-play-overlay, .btn-play-sermon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.getAttribute('data-id'));
        const sermon = sermonsData.find(s => s.id === id);
        if (sermon) {
          openSermonModal(sermon);
        }
      });
    });
  }

  // Initial Render
  // (Already called in initSermons above after fetch)
});
