// BACKEND REMOVED — see live stream status previously called /api/facebook/live-status and /api/facebook/latest-live. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Live Stream Page Specific JavaScript (js/pages/live.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const liveBanner = document.getElementById('live-status-banner');
  const liveText = document.getElementById('live-status-text');
  const offlineOverlay = document.getElementById('stream-offline-overlay');

  function checkIsLiveBySchedule() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 3 = Wed, 5 = Fri
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    let isLive = false;

    // Sunday Service: 8:00 AM (480 mins) to 11:30 AM (690 mins)
    if (day === 0 && currentTimeInMinutes >= 480 && currentTimeInMinutes <= 690) {
      isLive = true;
    }
    // Wednesday Service: 6:30 PM (1110 mins) to 8:30 PM (1230 mins)
    else if (day === 3 && currentTimeInMinutes >= 1110 && currentTimeInMinutes <= 1230) {
      isLive = true;
    }
    // Friday Service: 6:30 PM (1110 mins) to 9:00 PM (1260 mins)
    else if (day === 5 && currentTimeInMinutes >= 1110 && currentTimeInMinutes <= 1260) {
      isLive = true;
    }

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

  checkIsLiveBySchedule();
});
