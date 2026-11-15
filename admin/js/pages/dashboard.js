/* Admin dashboard: five counts, each with a link to its page.
   The counts come from GET /api/admin/stats. */

document.addEventListener('DOMContentLoaded', async () => {
  if (!AdminAuth.checkAuth()) return;

  AdminAuth.initShell('dashboard', 'Dashboard');

  // Which count goes in which panel.
  const PANELS = {
    sermons: 'stat-sermons',
    upcomingEvents: 'stat-events',
    newMessages: 'stat-messages',
    newPrayerRequests: 'stat-prayers',
    subscribers: 'stat-newsletter',
  };

  function setValue(panelId, text) {
    const value = document.querySelector(`#${panelId} .stat-value`);
    if (value) value.textContent = text;
  }

  try {
    const response = await AdminApi.get('/admin/stats');
    Object.entries(PANELS).forEach(([key, panelId]) => setValue(panelId, String(response.data[key] ?? 0)));
  } catch (err) {
    const banner = document.getElementById('dashboard-error');
    banner.textContent = err.status === 0
      ? 'The counts could not be loaded because the server cannot be reached.'
      : `The counts could not be loaded. ${err.message}`;
    banner.classList.add('visible');
    Object.values(PANELS).forEach((panelId) => setValue(panelId, '-'));
  }
});
