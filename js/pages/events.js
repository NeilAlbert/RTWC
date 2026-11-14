/* Events page. Events come from /api/events and are split into upcoming and past
   by comparing each date with today, so the page stays correct as dates pass. */

(() => {
  const list = document.getElementById('event-list');
  const status = document.getElementById('event-status');
  const heading = document.getElementById('events-heading');
  const viewButtons = document.querySelectorAll('.event-views button');
  const categorySelect = document.getElementById('event-category');
  const calendarStatus = document.getElementById('calendar-status');
  const feedInput = document.getElementById('calendar-feed-url');
  const copyButton = document.getElementById('copy-calendar-link');
  const subscribeLink = document.getElementById('subscribe-calendar');

  let events = [];
  let view = 'upcoming';

  function parseDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function eventsFor(whichView) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return whichView === 'upcoming'
      ? events.filter(event => parseDate(event.event_date) >= today)
          .sort((a, b) => parseDate(a.event_date) - parseDate(b.event_date))
      : events.filter(event => parseDate(event.event_date) < today)
          .sort((a, b) => parseDate(b.event_date) - parseDate(a.event_date));
  }

  // Start and end for a calendar entry, read from free text such as "6:30 PM - 9:00 PM".
  // An event with no readable time becomes an all-day entry.
  function calendarTimes(event) {
    const [year, month, day] = event.event_date.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day));
    const times = [...String(event.event_time || '').matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)];

    if (times.length === 0) {
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end, allDay: true };
    }

    const toMinutes = match => (Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(match[2] || 0);

    const startMinutes = toMinutes(times[0]);
    start.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60);

    const end = new Date(start);
    if (times.length > 1) {
      const endMinutes = toMinutes(times[1]);
      end.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60);
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
    } else {
      end.setUTCHours(end.getUTCHours() + 1);
    }
    return { start, end, allDay: false };
  }

  function googleCalendarUrl(event) {
    const { start, end, allDay } = calendarTimes(event);
    const pad = number => String(number).padStart(2, '0');
    const day = date => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
    const dayAndTime = date => `${day(date)}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
    const format = allDay ? day : dayAndTime;
    return `https://calendar.google.com/calendar/render?${new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${format(start)}/${format(end)}`,
      details: event.description || '',
      location: event.location || ''
    })}`;
  }

  function eventItem(event) {
    const item = document.createElement('li');
    item.className = 'event';
    item.id = `event-${event.id}`;

    const date = document.createElement('p');
    date.className = 'event-date';
    date.textContent = window.rtwc.formatDate(event.event_date);

    const title = document.createElement('h3');
    title.textContent = event.title;

    const details = document.createElement('p');
    details.className = 'event-meta';
    details.textContent = [
      event.event_time ? window.rtwc.formatTime(event.event_time) : 'Time to be announced',
      event.location || 'Venue to be announced',
      event.category
    ].join(', ');

    item.append(date, title, details);

    if (event.description) {
      const description = document.createElement('p');
      description.textContent = event.description;
      item.append(description);
    }

    if (view === 'upcoming') {
      const addLink = document.createElement('a');
      addLink.href = googleCalendarUrl(event);
      addLink.textContent = 'Add to Google Calendar';
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = `: ${event.title}`;
      addLink.append(label);
      item.append(addLink);
    }
    return item;
  }

  function showEvents() {
    const inView = eventsFor(view);
    const matches = categorySelect.value === 'all'
      ? inView
      : inView.filter(event => event.category === categorySelect.value);

    heading.textContent = view === 'upcoming' ? 'Upcoming Events' : 'Past Events';
    list.replaceChildren(...matches.map(eventItem));

    if (matches.length > 0) status.textContent = '';
    else if (categorySelect.value !== 'all') status.textContent = 'No events of this type. Choose "All events" to see the rest.';
    else if (view === 'upcoming') status.textContent = 'No upcoming events right now. Please check back soon.';
    else status.textContent = 'No past events to show yet.';

    document.getElementById('count-upcoming').textContent = eventsFor('upcoming').length;
    document.getElementById('count-past').textContent = eventsFor('past').length;
  }

  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      view = button.dataset.view;
      viewButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      showEvents();
    });
  });

  categorySelect.addEventListener('change', showEvents);

  // Calendar apps can only subscribe to a feed on a real web address.
  if (['http:', 'https:'].includes(window.location.protocol)) {
    const feedUrl = new URL('/api/events/calendar.ics', window.location.origin).href;
    feedInput.value = feedUrl;
    subscribeLink.href = feedUrl.replace(/^https?:/, 'webcal:');
  } else {
    subscribeLink.setAttribute('aria-disabled', 'true');
    copyButton.disabled = true;
    calendarStatus.textContent = 'The calendar link works on the published website only.';
  }

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(feedInput.value);
      calendarStatus.textContent = 'Link copied. Paste it into the "Subscribe by URL" or "From URL" box in your calendar app.';
    } catch (error) {
      console.error('Could not copy the calendar link.', error);
      feedInput.select();
      calendarStatus.textContent = 'The link could not be copied for you. It is selected above, so you can copy it yourself.';
    }
  });

  (async () => {
    try {
      const response = await fetch('/api/events', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`Events API returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (!payload.success || !Array.isArray(payload.data)) throw new Error('Events API returned an invalid response.');
      events = payload.data;
      showEvents();
    } catch (error) {
      console.error('Could not load events.', error);
      status.textContent = 'Events could not be loaded. Please try again later.';
    }
  })();
})();
