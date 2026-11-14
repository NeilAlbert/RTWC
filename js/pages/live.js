/* Watch Live page. Asks the API whether the church is live on YouTube or Facebook
   and shows the stream. The YouTube and Facebook links come from Admin > Settings. */

(() => {
  const FACEBOOK_PAGE = 'https://www.facebook.com/cop.rtwc';
  const FACEBOOK_VIDEOS = `${FACEBOOK_PAGE}/videos`;
  const NAMES = { youtube: 'YouTube', facebook: 'Facebook' };

  const status = document.getElementById('live-status');
  const offlinePanel = document.getElementById('live-offline');
  const offlineMessage = document.getElementById('offline-message');
  const nextService = document.getElementById('next-service');
  const watchLink = document.getElementById('watch-directly-link');
  const frames = {
    youtube: document.getElementById('youtube-frame'),
    facebook: document.getElementById('facebook-frame')
  };
  const buttons = {
    youtube: document.getElementById('youtube-button'),
    facebook: document.getElementById('facebook-button')
  };
  const platformSelector = document.getElementById('platform-selector');
  const platformLinks = document.getElementById('platform-links');
  const streamTitle = document.getElementById('stream-title');
  const shareLink = document.getElementById('share-link');
  const recentServiceLink = document.getElementById('recent-service-link');

  let settings = { youtubeVideoId: '', youtubeUrl: '', facebookUrl: FACEBOOK_PAGE, preferred: 'facebook', override: '' };
  let streams = {};

  // Settings are typed in by an admin, so only links to the expected sites are used.
  function trustedUrl(value, domains) {
    try {
      const url = new URL(value);
      const trusted = url.protocol === 'https:' &&
        domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
      return trusted ? url.href : '';
    } catch {
      return '';
    }
  }

  async function fetchData(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || `Request failed (${response.status}).`);
    if (payload.data?.error) throw new Error(payload.data.error);
    return payload.data;
  }

  function readSettings(values) {
    const videoId = (values.youtube_live_video_id || '').trim();
    const youtubeVideoId = /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
    return {
      youtubeVideoId,
      youtubeUrl: trustedUrl(values.youtube_channel_url || '', ['youtube.com', 'youtu.be']) ||
        (youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : ''),
      facebookUrl: trustedUrl(values.facebook_live_url || '', ['facebook.com']) || FACEBOOK_PAGE,
      preferred: values.preferred_default_platform === 'facebook' ? 'facebook' : 'youtube',
      override: values.live_status_override || ''
    };
  }

  function directUrl(platform) {
    if (platform === 'youtube') return settings.youtubeUrl;
    return streams.facebook?.video?.permalinkUrl || settings.facebookUrl;
  }

  function showPageLinks(values) {
    const links = [];
    if (settings.youtubeUrl) links.push(['Watch on YouTube', settings.youtubeUrl]);
    links.push(['Watch on Facebook', settings.facebookUrl]);
    platformLinks.replaceChildren(...links.map(([label, href]) => {
      const link = document.createElement('a');
      link.className = 'button-plain';
      link.href = href;
      link.textContent = label;
      return link;
    }));

    const recent = trustedUrl(values.previous_broadcast_url || '', ['youtube.com', 'youtu.be', 'facebook.com']);
    if (recent) recentServiceLink.href = recent;

    if (values.next_service_date) {
      const parts = [
        values.next_service_title,
        window.rtwc.formatDate(values.next_service_date),
        values.next_service_time && window.rtwc.formatTime(values.next_service_time)
      ].filter(Boolean);
      nextService.textContent = `Next broadcast: ${parts.join(', ')}.`;
      nextService.hidden = false;
    }
  }

  function hidePlayers() {
    Object.values(frames).forEach(frame => {
      frame.hidden = true;
      frame.removeAttribute('src');
    });
  }

  function showOffline(statusText, message) {
    hidePlayers();
    platformSelector.hidden = true;
    streamTitle.hidden = true;
    shareLink.hidden = true;
    status.textContent = statusText;
    offlineMessage.textContent = message;
    offlinePanel.hidden = false;

    const platform = settings.preferred === 'youtube' && settings.youtubeUrl ? 'youtube' : 'facebook';
    watchLink.href = platform === 'youtube' ? settings.youtubeUrl : FACEBOOK_VIDEOS;
    watchLink.textContent = `Watch on ${NAMES[platform]}`;
  }

  function embedUrl(platform, stream) {
    if (platform === 'youtube') {
      const videoId = stream.video?.videoId || settings.youtubeVideoId;
      return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0` : '';
    }
    const permalink = trustedUrl(stream.video?.permalinkUrl || '', ['facebook.com']);
    if (!permalink) return '';
    return `https://www.facebook.com/plugins/video.php?${new URLSearchParams({ href: permalink, show_text: 'false', width: '700' })}`;
  }

  function showStream(platform) {
    const stream = streams[platform];
    if (!stream?.isLive) return;

    hidePlayers();
    const url = embedUrl(platform, stream);
    if (url) {
      frames[platform].src = url;
      frames[platform].hidden = false;
      offlinePanel.hidden = true;
    } else {
      offlineMessage.textContent = 'We are live, but the video cannot be shown on this page.';
      offlinePanel.hidden = false;
      watchLink.href = directUrl(platform);
      watchLink.textContent = `Watch on ${NAMES[platform]}`;
    }

    status.textContent = `We are live now on ${NAMES[platform]}.`;
    streamTitle.textContent = stream.video?.title || 'Live service';
    streamTitle.hidden = false;

    const share = document.createElement('a');
    share.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    share.textContent = 'Share this page on Facebook';
    shareLink.replaceChildren(share);
    shareLink.hidden = false;

    const live = Object.keys(streams).filter(name => streams[name]?.isLive);
    platformSelector.hidden = live.length < 2;
    Object.entries(buttons).forEach(([name, button]) => {
      button.disabled = !streams[name]?.isLive;
      button.setAttribute('aria-pressed', String(name === platform));
    });
  }

  async function start() {
    const values = await window.rtwc.settings;
    if (!values) {
      showOffline('We could not check whether a service is live.', 'Please use the Facebook link to watch.');
      return;
    }
    settings = readSettings(values);
    showPageLinks(values);

    const checks = { facebook: () => fetchData('/api/facebook/live-status') };
    if (settings.youtubeVideoId) {
      checks.youtube = async () => {
        const video = await fetchData(`/api/youtube/live-status?videoId=${encodeURIComponent(settings.youtubeVideoId)}`);
        return { isLive: Boolean(video?.isLive), video };
      };
    }

    streams = Object.fromEntries(await Promise.all(
      Object.entries(checks).map(async ([platform, check]) => {
        try {
          return [platform, await check()];
        } catch (error) {
          console.error(`Could not check ${NAMES[platform]} live status.`, error);
          return [platform, { isLive: false, failed: true }];
        }
      })
    ));

    if (settings.override === 'offline') {
      showOffline('We are not live at the moment.', 'Our services are shown here while they are live.');
      return;
    }

    // An admin can mark the stream as live when the automatic check misses it.
    if (settings.override === 'live' && !Object.values(streams).some(stream => stream.isLive)) {
      const platform = settings.preferred === 'youtube' && settings.youtubeUrl ? 'youtube' : 'facebook';
      streams[platform] = {
        isLive: true,
        video: platform === 'youtube' && settings.youtubeVideoId ? { videoId: settings.youtubeVideoId } : null
      };
    }

    const live = Object.keys(streams).filter(platform => streams[platform].isLive);
    if (live.length > 0) {
      showStream(live.includes(settings.preferred) ? settings.preferred : live[0]);
    } else if (Object.values(streams).every(stream => stream.failed)) {
      showOffline('We could not check whether a service is live.', 'Please use the links below to watch.');
    } else {
      showOffline('We are not live at the moment.', 'Our services are shown here while they are live.');
    }
  }

  buttons.youtube.addEventListener('click', () => showStream('youtube'));
  buttons.facebook.addEventListener('click', () => showStream('facebook'));

  start();
})();
