document.addEventListener('DOMContentLoaded', () => {
  const liveBanner = document.getElementById('live-status-banner');
  const liveText = document.getElementById('live-status-text');
  const offlineOverlay = document.getElementById('stream-offline-overlay');
  const offlineMessage = document.getElementById('offline-message');
  const youtubePlayer = document.getElementById('youtube-player');
  const facebookPlayer = document.getElementById('facebook-player');
  const youtubeFrame = document.getElementById('yt-live-iframe');
  const facebookFrame = document.getElementById('fb-live-iframe');
  const youtubeBtn = document.getElementById('youtube-btn');
  const facebookBtn = document.getElementById('facebook-btn');
  const platformSelector = document.getElementById('platform-selector');
  const platformLinks = document.getElementById('platform-links');
  const streamTitle = document.getElementById('stream-title');
  const streamDesc = document.getElementById('stream-desc');
  const watchDirectlyLink = document.getElementById('watch-directly-link');
  const shareButtons = document.querySelector('.share-buttons');
  const defaultFacebookUrl = 'https://www.facebook.com/cop.rtwc/videos';
  const defaultYoutubeUrl = 'https://www.youtube.com';

  let settings = null;
  let liveStreams = {};

  function trustedHttpsUrl(value, domains) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return '';
      return domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
        ? url.href
        : '';
    } catch {
      return '';
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return payload;
  }

  function getSettings(payload) {
    const values = payload.data || {};
    const rawVideoId = (values.youtube_live_video_id || '').trim();
    const youtubeVideoId = /^[A-Za-z0-9_-]{11}$/.test(rawVideoId) ? rawVideoId : '';
    if (rawVideoId && !youtubeVideoId) {
      console.error('The configured YouTube live video ID is invalid.');
    }

    return {
      youtubeVideoId,
      youtubeUrl: trustedHttpsUrl(values.youtube_channel_url || '', ['youtube.com', 'youtu.be'])
        || (youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : ''),
      facebookUrl: trustedHttpsUrl(values.facebook_live_url || '', ['facebook.com']) || '',
      preferredPlatform: values.preferred_default_platform === 'facebook' ? 'facebook' : 'youtube',
      statusOverride: values.live_status_override || '',
    };
  }

  function makeLink(url, label) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'btn btn-outline';
    link.textContent = label;
    return link;
  }

  function renderDirectLinks() {
    if (!platformLinks) return;
    platformLinks.replaceChildren();

    if (settings.youtubeUrl) {
      platformLinks.appendChild(makeLink(settings.youtubeUrl, 'Watch on YouTube'));
    }
    platformLinks.appendChild(makeLink(settings.facebookUrl || defaultFacebookUrl, 'Watch on Facebook'));
  }

  function setWatchLink(platform, url) {
    if (!watchDirectlyLink) return;
    watchDirectlyLink.href = url || (platform === 'youtube' ? defaultYoutubeUrl : defaultFacebookUrl);
    watchDirectlyLink.target = '_blank';
    watchDirectlyLink.rel = 'noopener noreferrer';
    watchDirectlyLink.textContent = `Watch on ${platform === 'youtube' ? 'YouTube' : 'Facebook'} →`;
  }

  function setOfflineMessage(message, platform, url) {
    if (!offlineMessage) return;
    const link = watchDirectlyLink || document.createElement('a');
    const destination = url || (platform === 'youtube' ? defaultYoutubeUrl : defaultFacebookUrl);
    link.className = '';
    link.href = destination;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `Watch on ${platform === 'youtube' ? 'YouTube' : 'Facebook'} →`;
    offlineMessage.replaceChildren(document.createTextNode(`${message} `), link);
  }

  function clearPlayers() {
    if (youtubePlayer) youtubePlayer.hidden = true;
    if (facebookPlayer) facebookPlayer.hidden = true;
    if (youtubeFrame) youtubeFrame.removeAttribute('src');
    if (facebookFrame) facebookFrame.removeAttribute('src');
  }

  function showOffline(message) {
    clearPlayers();
    if (platformSelector) platformSelector.hidden = true;
    if (liveBanner) {
      liveBanner.classList.remove('is-live');
      liveBanner.classList.add('is-visible');
    }
    if (liveText) liveText.textContent = 'BROADCAST OFFLINE — SEE SERVICE SCHEDULE';
    if (streamTitle) streamTitle.textContent = 'No live broadcast right now';
    if (streamDesc) streamDesc.textContent = 'Join us during our next scheduled service.';
    if (offlineOverlay) offlineOverlay.classList.remove('hidden');
    const platform = settings && settings.preferredPlatform === 'youtube' && settings.youtubeUrl
      ? 'youtube'
      : 'facebook';
    const directUrl = platform === 'youtube' ? settings.youtubeUrl : settings.facebookUrl;
    setOfflineMessage(message, platform, directUrl);
    if (shareButtons) shareButtons.replaceChildren();
  }

  function showUnverified(errorMessage) {
    showOffline(errorMessage || 'We could not confirm the stream status. ');
    if (liveText) liveText.textContent = 'STREAM STATUS UNAVAILABLE';
    if (streamTitle) streamTitle.textContent = 'Stream status unavailable';
  }

  function embedUrl(platform, stream) {
    if (platform === 'youtube') {
      const videoId = stream.video?.videoId || settings.youtubeVideoId;
      return videoId
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`
        : '';
    }

    const permalink = trustedHttpsUrl(stream.video?.permalinkUrl || '', ['facebook.com']);
    if (!permalink) return '';
    const url = new URL('https://www.facebook.com/plugins/video.php');
    url.searchParams.set('href', permalink);
    url.searchParams.set('show_text', 'false');
    url.searchParams.set('width', '700');
    return url.href;
  }

  function updateShareLink(platform) {
    if (!shareButtons) return;
    const share = makeLink(
      platform === 'youtube'
        ? `https://www.youtube.com/share?url=${encodeURIComponent(window.location.href)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      `Share on ${platform === 'youtube' ? 'YouTube' : 'Facebook'}`
    );
    share.className = 'btn btn-outline btn-sm';
    shareButtons.replaceChildren(share);
  }

  function selectStream(platform) {
    const stream = liveStreams[platform];
    if (!stream || !stream.isLive) return;

    const url = embedUrl(platform, stream);
    clearPlayers();

    if (url && platform === 'youtube' && youtubeFrame && youtubePlayer) {
      youtubeFrame.src = url;
      youtubePlayer.hidden = false;
      if (offlineOverlay) offlineOverlay.classList.add('hidden');
    } else if (url && platform === 'facebook' && facebookFrame && facebookPlayer) {
      facebookFrame.src = url;
      facebookPlayer.hidden = false;
      if (offlineOverlay) offlineOverlay.classList.add('hidden');
    } else {
      if (offlineOverlay) offlineOverlay.classList.remove('hidden');
      const directUrl = platform === 'youtube'
        ? settings.youtubeUrl
        : (stream.video?.permalinkUrl || settings.facebookUrl || defaultFacebookUrl);
      setOfflineMessage('The stream is live but cannot be embedded here.', platform, directUrl);
    }

    if (liveBanner) liveBanner.classList.add('is-visible', 'is-live');
    if (liveText) liveText.textContent = `WE ARE LIVE ON ${platform.toUpperCase()}`;
    if (streamTitle) {
      streamTitle.textContent = stream.video?.title || `${platform === 'youtube' ? 'YouTube' : 'Facebook'} Live Stream`;
    }
    if (streamDesc) streamDesc.textContent = `Streaming live on ${platform === 'youtube' ? 'YouTube' : 'Facebook'}.`;
    setWatchLink(platform, platform === 'youtube'
      ? settings.youtubeUrl
      : (stream.video?.permalinkUrl || settings.facebookUrl || defaultFacebookUrl));

    const livePlatforms = Object.keys(liveStreams).filter((name) => liveStreams[name]?.isLive);
    if (platformSelector) platformSelector.hidden = livePlatforms.length < 2;
    if (youtubeBtn) {
      youtubeBtn.disabled = !liveStreams.youtube?.isLive;
      youtubeBtn.setAttribute('aria-pressed', String(platform === 'youtube'));
    }
    if (facebookBtn) {
      facebookBtn.disabled = !liveStreams.facebook?.isLive;
      facebookBtn.setAttribute('aria-pressed', String(platform === 'facebook'));
    }
    updateShareLink(platform);
  }

  async function checkYoutube() {
    const result = await fetchJson(`/api/youtube/live-status?videoId=${encodeURIComponent(settings.youtubeVideoId)}`);
    if (result.data?.error) throw new Error(result.data.error);
    return { isLive: Boolean(result.data?.isLive), video: result.data };
  }

  async function checkFacebook() {
    const result = await fetchJson('/api/facebook/live-status');
    if (result.data?.error) throw new Error(result.data.error);
    return { isLive: Boolean(result.data?.isLive), video: result.data?.video || null };
  }

  async function initialize() {
    try {
      const payload = await fetchJson('/api/settings');
      settings = getSettings(payload);
      renderDirectLinks();

      const checks = {};
      if (settings.youtubeVideoId) {
        checks.youtube = checkYoutube();
      }
      if (settings.facebookUrl) {
        checks.facebook = checkFacebook();
      }

      const results = await Promise.all(
        Object.entries(checks).map(async ([platform, check]) => {
          try {
            return [platform, await check];
          } catch (error) {
            console.error(`Failed to check ${platform} live status:`, error);
            return [platform, { isLive: false, error }];
          }
        })
      );
      liveStreams = Object.fromEntries(results);

      if (settings.statusOverride === 'offline') {
        showOffline('Our next live service will appear here during service hours.');
        return;
      }

      if (settings.statusOverride === 'live' && !Object.values(liveStreams).some((stream) => stream.isLive)) {
        const platform = settings.preferredPlatform === 'youtube' && !settings.youtubeUrl && settings.facebookUrl
          ? 'facebook'
          : settings.preferredPlatform;
        const hasDestination = platform === 'youtube'
          ? Boolean(settings.youtubeUrl)
          : Boolean(settings.facebookUrl);
        if (!hasDestination) {
          showUnverified('Live status is set to live, but no streaming destination is configured in Admin > Settings.');
          return;
        }
        const videoId = settings.youtubeVideoId;
        liveStreams[platform] = {
          isLive: true,
          video: platform === 'youtube' && videoId
            ? { videoId, title: 'Live Broadcast' }
            : null,
        };
      }

      const availablePlatforms = Object.keys(liveStreams).filter((platform) => liveStreams[platform].isLive);
      if (availablePlatforms.length) {
        const preferredLivePlatform = availablePlatforms.includes(settings.preferredPlatform)
          ? settings.preferredPlatform
          : availablePlatforms[0];
        selectStream(preferredLivePlatform);
        return;
      }

      const failures = Object.values(liveStreams).filter((stream) => stream.error);
      if (failures.length && failures.length === Object.keys(liveStreams).length) {
        showUnverified('We could not confirm the stream status. Please use a direct link below.');
      } else {
        showOffline('Our next live service will appear here during service hours.');
      }
    } catch (error) {
      console.error('Failed to initialize the live stream page:', error);
      settings = settings || {
        preferredPlatform: 'facebook',
        facebookUrl: '',
        youtubeUrl: '',
        youtubeVideoId: '',
      };
      renderDirectLinks();
      showUnverified('We could not load stream details. Please use a direct link below.');
    }
  }

  if (youtubeBtn) youtubeBtn.addEventListener('click', () => selectStream('youtube'));
  if (facebookBtn) facebookBtn.addEventListener('click', () => selectStream('facebook'));

  initialize();
});
