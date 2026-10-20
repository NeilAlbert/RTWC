/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Home Page Specific JavaScript (js/pages/index.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('upcoming-events-container');
  if (eventsContainer) {
    fetch('/api/events?upcoming=true')
      .then((response) => {
        if (!response.ok) throw new Error('Events are temporarily unavailable.');
        return response.json();
      })
      .then((response) => {
        const events = Array.isArray(response.data) ? response.data.slice(0, 3) : [];
        if (!events.length) {
          eventsContainer.textContent = 'No upcoming events at the moment.';
          return;
        }
        eventsContainer.innerHTML = events.map((event) => {
          const date = new Date(`${event.event_date}T00:00:00`);
          const month = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en', { month: 'short' }).toUpperCase();
          const day = Number.isNaN(date.getTime()) ? '' : String(date.getDate()).padStart(2, '0');
          return `
            <article class="event-preview-card">
              <div class="event-card-header">
                <div class="event-date-badge">
                  <span class="event-date-month">${window.escapeHtml(month)}</span>
                  <span class="event-date-day">${window.escapeHtml(day)}</span>
                </div>
                <span class="event-card-category">${window.escapeHtml(event.category || 'Event')}</span>
              </div>
              <div class="event-card-body">
                <h3 class="event-card-title">${window.escapeHtml(event.title)}</h3>
                <div class="event-card-meta">
                  <div class="event-meta-line"><span>${window.escapeHtml(event.start_time || 'Time to be announced')}</span></div>
                  <div class="event-meta-line"><span>${window.escapeHtml(event.location || 'Location to be announced')}</span></div>
                </div>
                <p class="event-card-desc">${window.escapeHtml(event.description || '')}</p>
                <a href="events.html#event-${window.escapeHtml(event.id)}" class="btn btn-outline-gold btn-full-width">Event Details</a>
              </div>
            </article>`;
        }).join('');
      })
      .catch(() => {
        eventsContainer.textContent = 'Upcoming events could not be loaded right now.';
      });
  }

  const featuredTitle = document.getElementById('featured-sermon-title');
  const featuredSpeaker = document.getElementById('featured-sermon-speaker');
  const featuredDate = document.getElementById('featured-sermon-date');
  const featuredDescription = document.getElementById('featured-sermon-description');
  const featuredThumbnail = document.getElementById('featured-sermon-thumbnail');
  const playOverlayBtn = document.querySelector('.play-overlay-btn');
  let featuredVideoUrl = '';

  fetch('/api/sermons?limit=1')
    .then((response) => {
      if (!response.ok) throw new Error('Sermons are temporarily unavailable.');
      return response.json();
    })
    .then((response) => {
      const items = Array.isArray(response.data) ? response.data : response.data?.items || [];
      const sermon = items[0];
      if (!sermon) {
        if (featuredDescription) featuredDescription.textContent = 'No sermons have been published yet.';
        return;
      }
      if (featuredTitle) featuredTitle.textContent = sermon.title || 'Latest Sermon';
      if (featuredSpeaker) featuredSpeaker.textContent = sermon.speaker || 'Speaker not listed';
      if (featuredDate) {
        const date = sermon.sermon_date ? new Date(`${sermon.sermon_date}T00:00:00`) : null;
        featuredDate.textContent = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '';
      }
      if (featuredDescription) featuredDescription.textContent = sermon.description || '';
      const thumbnailUrl = window.safePublicUrl(sermon.thumbnail_url);
      if (featuredThumbnail && thumbnailUrl) featuredThumbnail.src = thumbnailUrl;
      if (featuredThumbnail) featuredThumbnail.alt = sermon.title || 'Latest published sermon';
      featuredVideoUrl = window.safePublicUrl(sermon.video_url);
      if (playOverlayBtn && featuredVideoUrl) playOverlayBtn.hidden = false;
    })
    .catch(() => {
      if (featuredDescription) featuredDescription.textContent = 'The sermon library could not be loaded right now.';
    });

  if (playOverlayBtn) {
    playOverlayBtn.addEventListener('click', () => {
      if (featuredVideoUrl) window.open(featuredVideoUrl, '_blank', 'noopener,noreferrer');
    });
  }
});
