/* Home page: the next three events from the events API. */

(async () => {
  const list = document.getElementById('home-events');
  const status = document.getElementById('home-events-status');

  try {
    const response = await fetch('/api/events?upcoming=true', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Events API returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.data)) throw new Error('Events API returned an invalid response.');

    const events = payload.data.slice(0, 3);
    if (events.length === 0) {
      status.textContent = 'No upcoming events right now. Please check back soon.';
      return;
    }

    list.replaceChildren(...events.map(event => {
      const item = document.createElement('li');
      item.className = 'event';

      const date = document.createElement('p');
      date.className = 'event-date';
      date.textContent = window.rtwc.formatDate(event.event_date);

      const title = document.createElement('h3');
      const link = document.createElement('a');
      link.href = `events.html#event-${event.id}`;
      link.textContent = event.title;
      title.append(link);

      const details = document.createElement('p');
      details.className = 'event-meta';
      details.textContent = [event.event_time && window.rtwc.formatTime(event.event_time), event.location]
        .filter(Boolean)
        .join(', ');

      item.append(date, title, details);
      return item;
    }));
    status.textContent = '';
  } catch (error) {
    console.error('Could not load upcoming events.', error);
    status.textContent = 'Events could not be loaded. Please try again later.';
  }
})();
