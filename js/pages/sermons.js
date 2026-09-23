// BACKEND REMOVED — see sermons archive previously called /api/sermons. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Sermons Page Specific JavaScript (js/pages/sermons.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     STATIC LOCAL SERMONS ARCHIVE DATA
     ========================================================================== */
  const sermonsData = [
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
      description: "Discover how to align your daily walk with God's sovereign blueprint. In this message, Pastor Ofori unpacks keys to spiritual authority and unwavering faith.",
      summary: "Discover how to align your daily walk with God's sovereign blueprint. In this message, Pastor Ofori unpacks keys to spiritual authority and unwavering faith."
    },
    {
      id: 2,
      title: "The Mystery of Prevailing Prayer",
      speaker: "Elder Samuel Mensah",
      sermon_date: "July 19, 2026",
      date: "July 19, 2026",
      category: "Sunday Worship",
      thumbnail_url: "assets/images/hero.jpg",
      thumbnail: "assets/images/hero.jpg",
      video_url: "https://www.facebook.com/cop.rtwc/videos",
      description: "An in-depth look at Jesus' teaching on persistence in prayer, breaking spiritual hindrances, and standing in intercessory agreement.",
      summary: "An in-depth look at Jesus' teaching on persistence in prayer, breaking spiritual hindrances, and standing in intercessory agreement."
    },
    {
      id: 3,
      title: "Possessing Your Possessions in Christ",
      speaker: "Pastor Emmanuel K. Ofori",
      sermon_date: "July 15, 2026",
      date: "July 15, 2026",
      category: "Bible Study",
      thumbnail_url: "assets/images/welcome-pastor.jpg",
      thumbnail: "assets/images/welcome-pastor.jpg",
      video_url: "https://www.facebook.com/cop.rtwc/videos",
      description: "Expository Bible study on Obadiah 1:17. Learn how holiness and deliverance pave the way for believers to reclaim their covenant inheritance.",
      summary: "Expository Bible study on Obadiah 1:17. Learn how holiness and deliverance pave the way for believers to reclaim their covenant inheritance."
    },
    {
      id: 4,
      title: "Unshakable Faith in Times of Trial",
      speaker: "Guest Minister",
      sermon_date: "July 12, 2026",
      date: "July 12, 2026",
      category: "Revival Service",
      thumbnail_url: "assets/images/sermon-latest.jpg",
      thumbnail: "assets/images/sermon-latest.jpg",
      video_url: "https://www.facebook.com/cop.rtwc/videos",
      description: "A powerful revival message on maintaining spiritual resilience, anchoring your hope in Christ, and overcoming life's storms.",
      summary: "A powerful revival message on maintaining spiritual resilience, anchoring your hope in Christ, and overcoming life's storms."
    },
    {
      id: 5,
      title: "The Holy Spirit: Our Helper & Guide",
      speaker: "Pastor Emmanuel K. Ofori",
      sermon_date: "July 05, 2026",
      date: "July 05, 2026",
      category: "Sunday Worship",
      thumbnail_url: "assets/images/hero.jpg",
      thumbnail: "assets/images/hero.jpg",
      video_url: "https://www.facebook.com/cop.rtwc/videos",
      description: "Understanding the person, gifts, and guidance of the Holy Spirit in the believer's daily journey and ministry.",
      summary: "Understanding the person, gifts, and guidance of the Holy Spirit in the believer's daily journey and ministry."
    },
    {
      id: 6,
      title: "Stewardship and Kingdom Finances",
      speaker: "Elder Samuel Mensah",
      sermon_date: "June 28, 2026",
      date: "June 28, 2026",
      category: "Bible Study",
      thumbnail_url: "assets/images/welcome-pastor.jpg",
      thumbnail: "assets/images/welcome-pastor.jpg",
      video_url: "https://www.facebook.com/cop.rtwc/videos",
      description: "Biblical principles of tithing, sacrificial giving, and wise financial management according to God's Word.",
      summary: "Biblical principles of tithing, sacrificial giving, and wise financial management according to God's Word."
    }
  ];

  const container = document.getElementById('sermons-container');
  const searchInput = document.getElementById('search-input');
  const speakerSelect = document.getElementById('speaker-select');
  const seriesSelect = document.getElementById('series-select');
  const noResultsMsg = document.getElementById('no-results-msg');

  // Modal Elements
  const modal = document.getElementById('sermon-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalSermonTitle = document.getElementById('modal-sermon-title');
  const modalSermonMeta = document.getElementById('modal-sermon-meta');
  const modalTitleDisplay = document.getElementById('modal-title-display');
  const modalDescDisplay = document.getElementById('modal-desc-display');

  // Render Sermons List
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
          <img src="${item.thumbnail}" alt="${item.title}" class="sermon-thumb-img">
          <span class="sermon-category-tag">${item.category}</span>
          <button class="sermon-play-overlay" data-id="${item.id}" aria-label="Play ${item.title}">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        <div class="sermon-card-body">
          <h3 class="sermon-card-title">${item.title}</h3>
          <div class="sermon-card-meta">
            <div class="sermon-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>${item.speaker}</span>
            </div>
            <div class="sermon-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${item.date}</span>
            </div>
          </div>
          <p class="sermon-card-desc">${item.summary}</p>
          <div class="sermon-card-actions">
            <button class="btn btn-primary btn-play-sermon btn-full-width" data-id="${item.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Watch / Listen Message
            </button>
          </div>
        </div>
      </article>
    `).join('');

    // Attach click listeners to play buttons
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

  // Filter Handler
  function filterSermons() {
    const query = searchInput.value.toLowerCase().trim();
    const speaker = speakerSelect.value;
    const category = seriesSelect.value;

    const filtered = sermonsData.filter(item => {
      const matchesQuery = item.title.toLowerCase().includes(query) || 
                           item.summary.toLowerCase().includes(query) ||
                           item.speaker.toLowerCase().includes(query);
      const matchesSpeaker = speaker === 'all' || item.speaker === speaker;
      const matchesCategory = category === 'all' || item.category === category;

      return matchesQuery && matchesSpeaker && matchesCategory;
    });

    renderSermons(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', filterSermons);
  if (speakerSelect) speakerSelect.addEventListener('change', filterSermons);
  if (seriesSelect) seriesSelect.addEventListener('change', filterSermons);

  // Modal Handlers
  function openSermonModal(sermon) {
    modalSermonTitle.textContent = sermon.title;
    modalSermonMeta.textContent = `${sermon.speaker} | ${sermon.date}`;
    modalTitleDisplay.textContent = sermon.title;
    modalDescDisplay.textContent = sermon.summary;

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

  // Initial Render
  renderSermons(sermonsData);
});
