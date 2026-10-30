// BACKEND REMOVED — see live stream status previously called /api/facebook/live-status and /api/facebook/latest-live. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Live Stream Page Specific JavaScript (js/pages/live.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const liveBanner = document.getElementById('live-status-banner');
  const liveText = document.getElementById('live-status-text');
  const offlineOverlay = document.getElementById('stream-offline-overlay');
  const youtubePlayer = document.getElementById('youtube-player');
  const facebookPlayer = document.getElementById('facebook-player');
  const youtubeBtn = document.getElementById('youtube-btn');
  const facebookBtn = document.getElementById('facebook-btn');
  const platformSelector = document.getElementById('platform-selector');
  const platformLinks = document.getElementById('platform-links');
  const streamTitle = document.getElementById('stream-title');
  const streamDesc = document.getElementById('stream-desc');
  const watchDirectlyLink = document.getElementById('watch-directly-link');
  const shareButtons = document.querySelector('.share-buttons');

  // Initialize platform state
  let currentPlatform = 'facebook'; // default, will be overridden by config or API
  let isCurrentlyLive = false;

  /**
   * Fetch live status from backend API (supports both YouTube and Facebook)
   */
  async function fetchLiveStatus() {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        const settings = data.data;
        // Set up platform config from settings
        const fbUrl = settings.facebook_live_url || '';
        const ytChannel = settings.youtube_channel_url || '';
        const ytVideoId = settings.youtube_live_video_id || '';
        const preferredPlatform = settings.preferred_default_platform || 'facebook';
        const statusOverride = settings.live_status_override;

        // If manual override is set, use it
        if (statusOverride) {
          isCurrentlyLive = statusOverride === 'live';
          updateUI(isCurrentlyLive, preferredPlatform);
          return;
        }

        // Check Facebook if configured
        if (fbUrl) {
          await checkFacebookLive(fbUrl);
          return;
        }

        // Check YouTube if configured
        if (ytVideoId || ytChannel) {
          await checkYouTubeLive(ytVideoId, ytChannel);
          return;
        }

        // No streams configured - show offline
        isCurrentlyLive = false;
        updateUI(false, 'facebook');
      }
    } catch (err) {
      logger.warn('Failed to fetch live status', { message: err.message });
      // Fallback: show offline state
      isCurrentlyLive = false;
      updateUI(false, 'facebook');
    }
  }

  /**
   * Check if Facebook stream is live using the Graph API
   */
  async function checkFacebookLive(fbUrl) {
    try {
      // Extract page ID from URL if needed
      const pageIdMatch = fbUrl.match(/facebook\.com\/([a-zA-Z0-9_.-]+)/i);
      const pageId = pageIdMatch ? pageIdMatch[1] : null;

      let url = '/api/facebook/live-status';
      if (pageId) {
        // We could make a more specific API call, but for now use the existing endpoint
        url += '?pageId=' + pageId;
      }

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (data.success && data.data && data.data.isLive) {
        isCurrentlyLive = true;
        // Populate stream info
        const video = data.data.video;
        if (video && video.title) {
          streamTitle.textContent = video.title;
        }
        updateUI(true, 'facebook');
      } else {
        isCurrentlyLive = false;
        updateUI(false, 'facebook');
      }
    } catch (err) {
      logger.warn('Facebook live check failed', { message: err.message });
      // If Graph API fails, still show offline but provide fallback link
      isCurrentlyLive = false;
      updateUI(false, 'facebook');
    }
  }

  /**
   * Check if YouTube stream is live using the YouTube Data API or video ID
   */
  async function checkYouTubeLive(videoId, channelUrl) {
    try {
      let isLive = false;
      let videoTitle = '';

      if (videoId) {
        // Use the video ID to check status
        const res = await fetch(
          'https://www.googleapis.com/youtube/v3/videos?part=status&id=' + videoId +
          '&key=' + (process.env.YOUTUBE_API_KEY || ''),
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const status = data.items[0].status;
          isLive = status.privacyStatus === 'public' && status.uploadStatus === 'processed';
          // Note: YouTube API may not accurately reflect live status without liveBroadcastContent=live
          if (status.liveBroadcastContent === 'live') {
            isLive = true;
            videoTitle = data.items[0].snippet.title || 'YouTube Live Stream';
          }
        }
      } else if (channelUrl) {
        // For channel-based approach, we'll use a simple check
        // YouTube doesn't have a simple public API for channel live status without API key
        // Fall back to checking if there's a configured video ID
        if (videoId) {
          await checkYouTubeLive(videoId, '');
        }
      }

      if (isLive) {
        isCurrentlyLive = true;
        streamTitle.textContent = videoTitle || 'YouTube Live Stream';
        updateUI(true, 'youtube');
      } else {
        isCurrentlyLive = false;
        updateUI(false, 'youtube');
      }
    } catch (err) {
      logger.warn('YouTube live check failed', { message: err.message });
      // If API fails, still provide the video link even if we can't confirm live
      isCurrentlyLive = false;
      // Try to at least show the video if we have an ID
      if (videoId) {
        loadYouTubePlayer(videoId);
        updateUI(false, 'youtube');
      } else {
        updateUI(false, 'youtube');
      }
    }
  }

  /**
   * Load YouTube player with the given video ID
   */
  function loadYouTubePlayer(videoId) {
    if (!youtubePlayer) return;
    youtubePlayer.style.display = 'block';
    facebookPlayer.style.display = 'none';
    const iframe = youtubePlayer.querySelector('iframe');
    if (iframe) {
      iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
    } else {
      const newIframe = document.createElement('iframe');
      newIframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
      newIframe.title = 'Royal Temple Worship Centre YouTube live';
      newIframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
      newIframe.allowFullscreen = true;
      youtubePlayer.innerHTML = '';
      youtubePlayer.appendChild(newIframe);
    }
  }

  /**
   * Update the UI based on live status and platform
   */
  function updateUI(isLive, platform) {
    isCurrentlyLive = isLive;
    currentPlatform = platform;

    // Hide both players initially
    if (youtubePlayer) youtubePlayer.style.display = 'none';
    if (facebookPlayer) facebookPlayer.style.display = 'none';
    if (platformSelector) platformSelector.style.display = 'none';

    if (isLive) {
      // Show the appropriate player
      if (platform === 'youtube' && youtubePlayer) {
        youtubePlayer.style.display = 'block';
        if (streamTitle) streamTitle.textContent = streamTitle.textContent || 'YouTube Live Stream';
      } else if (platform === 'facebook' && facebookPlayer) {
        facebookPlayer.style.display = 'block';
        if (streamTitle) streamTitle.textContent = streamTitle.textContent || 'Facebook Live Stream';
      }

      if (liveBanner) {
        liveBanner.classList.add('is-visible', 'is-live');
        if (liveText) liveText.textContent = 'WE ARE CURRENTLY LIVE ON AIR';
      }
      if (offlineOverlay) {
        offlineOverlay.classList.add('hidden');
      }
      if (platformLinks) {
        platformLinks.innerHTML = '';
      }
    } else {
      // Show offline state
      if (liveBanner) {
        liveBanner.classList.remove('is-live');
        if (liveText) liveText.textContent = 'BROADCAST OFFLINE — SEE SERVICE SCHEDULE';
        liveBanner.classList.add('is-visible');
      }
      if (offlineOverlay) {
        offlineOverlay.classList.remove('hidden');
      }
      if (platformLinks) {
        // Populate direct links from settings
        const settings = window.liveSettings || {};
        if (settings.facebook_live_url) {
          const fbLink = document.createElement('a');
          fbLink.href = settings.facebook_live_url;
          fbLink.target = '_blank';
          fbLink.rel = 'noopener noreferrer';
          fbLink.className = 'btn btn-outline';
          fbLink.textContent = 'Watch on Facebook';
          if (platformLinks.appendChild) platformLinks.appendChild(fbLink);
        }
        if (settings.youtube_channel_url || settings.youtube_live_video_id) {
          const ytLink = document.createElement('a');
          ytLink.href = 'https://www.youtube.com/channel/' + (settings.youtube_channel_url || '').replace('https://www.youtube.com/channel/', '') || 'auto';
          ytLink.target = '_blank';
          ytLink.rel = 'noopener noreferrer';
          ytLink.className = 'btn btn-outline';
          ytLink.textContent = 'Watch on YouTube';
          if (platformLinks.appendChild) platformLinks.appendChild(ytLink);
        }
      }
      if (watchDirectlyLink) {
        watchDirectlyLink.href = '/api/settings';
        watchDirectlyLink.textContent = 'Watch Live';
      }
    }

    // Update platform selector buttons
    if (youtubeBtn && facebookBtn) {
      youtubeBtn.setAttribute('aria-pressed', platform === 'youtube');
      facebookBtn.setAttribute('aria-pressed', platform === 'facebook');
      youtubeBtn.classList.toggle('active', platform === 'youtube');
      facebookBtn.classList.toggle('active', platform === 'facebook');
    }

    // Update share buttons
    updateShareButtons(platform);
  }

  /**
   * Update share buttons for the active platform
   */
  function updateShareButtons(platform) {
    if (!shareButtons) return;
    shareButtons.innerHTML = '';

    if (platform === 'youtube') {
      const ytShare = document.createElement('a');
      ytShare.href = 'https://www.youtube.com/share?url=' + (window.location.pathname);
      ytShare.target = '_blank';
      ytShare.rel = 'noopener noreferrer';
      ytShare.className = 'btn btn-outline btn-sm';
      ytShare.innerHTML = '<svg viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg> Share on YouTube';
      shareButtons.appendChild(ytShare);
    } else {
      const fbShare = document.createElement('a');
      fbShare.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href);
      fbShare.target = '_blank';
      fbShare.rel = 'noopener noreferrer';
      fbShare.className = 'btn btn-outline btn-sm';
      fbShare.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> Share on Facebook';
      shareButtons.appendChild(fbShare);
    }
  }

  /**
   * Platform button click handlers
   */
  if (youtubeBtn && facebookBtn) {
    youtubeBtn.addEventListener('click', () => {
      currentPlatform = 'youtube';
      if (isCurrentlyLive) {
        loadYouTubePlayer(youtubeBtn.dataset.videoId || '');
      } else {
        // Try to load with configured video ID from settings
        fetch('/api/settings', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            const settings = data.data || {};
            loadYouTubePlayer(settings.youtube_live_video_id || '');
          });
      }
      updateUI(true, 'youtube');
    });

    facebookBtn.addEventListener('click', () => {
      currentPlatform = 'facebook';
      if (isCurrentlyLive) {
        // Facebook live page already loaded
      } else {
        fetch('/api/settings', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            const settings = data.data || {};
            if (settings.facebook_live_url) {
              // Load Facebook player
              facebookPlayer.style.display = 'block';
              youtubePlayer.style.display = 'none';
              // Re-init Facebook SDK
              if (document.getElementById('fb-root')) {
                // SDK already loaded
              }
            }
          });
      }
      updateUI(true, 'facebook');
    });
  }

  // Make fetch available globally for caching
  window.fetch = window.fetch.bind(window);

  // Fetch live status on page load
  fetchLiveStatus();
});
