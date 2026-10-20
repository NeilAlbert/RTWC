/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Live Stream Page Specific JavaScript (js/pages/live.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const liveBanner = document.getElementById('live-status-banner');
  const liveText = document.getElementById('live-status-text');
  const offlineOverlay = document.getElementById('stream-offline-overlay');
  const platformSelect = document.getElementById('platform-select');
  const youtubeEmbed = document.getElementById('youtube-embed');
  const facebookEmbed = document.getElementById('facebook-embed');
  const platformLinks = document.getElementById('platform-links');
  const statusError = document.getElementById('status-error');
  let cachedStatus = {};

  // Initial check: fetch live status from API
  async function checkLiveStatus() {
    try {
      const response = await fetch('/api/facebook/live-status', {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      cachedStatus = data.data || {};
      updateLiveDisplay(cachedStatus);
    } catch (err) {
      console.warn('Live status fetch failed, using fallback:', err.message);
      showFallbackState('unavailable');
    }
  }

  function updateLiveDisplay(status) {
    const isLive = status.isLive;
    const fbError = status.fbError || '';
    const ytError = status.ytError || '';

    // Show/hide error summary
    // Determine which platform to show
    let platform = 'facebook';
    if (platformSelect) {
      platformSelect.value = status.preferredPlatform || 'facebook';
      platform = platformSelect.value;
    }

    // Hide both embeds first
    if (youtubeEmbed) youtubeEmbed.style.display = 'none';
    if (facebookEmbed) facebookEmbed.style.display = 'none';
    if (statusError) statusError.style.display = 'none';

    // Show Facebook embed
    if (platform === 'facebook' && status.fbVideo) {
      const facebookUrl = window.safePublicUrl(status.fbVideo.permalinkUrl);
      if (facebookUrl && ['facebook.com', 'www.facebook.com', 'fb.watch'].includes(new URL(facebookUrl).hostname)) {
        facebookEmbed.style.display = 'block';
        const facebookFrame = facebookEmbed.querySelector('iframe');
        if (facebookFrame) facebookFrame.src = facebookUrl;
      }
    }

    // Show YouTube embed
    if (platform === 'youtube' && status.ytVideo) {
      const yt = status.ytVideo;
      if (typeof yt.id === 'string' && /^[A-Za-z0-9_-]{6,20}$/.test(yt.id)) {
        const frame = document.createElement('iframe');
        frame.width = '100%';
        frame.height = '555';
        frame.style.border = 'none';
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt.id)}?autoplay=1&controls=1`;
        frame.title = yt.title || 'YouTube Live';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        youtubeEmbed.replaceChildren(frame);
        youtubeEmbed.style.display = 'block';
      }
    }

    if (statusError && (fbError || ytError)) {
      statusError.textContent = [fbError, ytError].filter(Boolean).join(' ');
      statusError.style.display = 'block';
    }

    // Live banner logic
    if (isLive) {
      if (liveBanner) {
        liveBanner.classList.add('is-visible', 'is-live');
        if (liveText) liveText.textContent = 'WE ARE CURRENTLY LIVE ON AIR';
      }
      if (offlineOverlay) {
        offlineOverlay.classList.add('hidden');
      }
    } else {
      if (liveBanner) {
        liveBanner.classList.remove('is-visible', 'is-live');
        if (liveText) liveText.textContent = 'BROADCAST OFFLINE — SEE SERVICE SCHEDULE';
      }
      if (offlineOverlay) {
        offlineOverlay.classList.remove('hidden');
      }
    }
  }

  function showFallbackState(reason) {
    if (liveBanner) {
      liveBanner.classList.remove('is-live');
      if (liveText) liveText.textContent = 'LIVE STATUS UNAVAILABLE — ' + reason;
    }
    if (offlineOverlay) {
      offlineOverlay.classList.remove('hidden');
    }
    if (statusError) {
      statusError.style.display = 'block';
      statusError.textContent = 'Live status ' + reason + '. View schedules or try again later.';
    }
  }

  // Platform selector change handler
  if (platformSelect) {
    platformSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      cachedStatus = { ...cachedStatus, preferredPlatform: selected };
      updateLiveDisplay(cachedStatus);
    });
  }

  // Initialize
  checkLiveStatus();
});

