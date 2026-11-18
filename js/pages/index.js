/* Home page: the next three events from the events API, and the featured verse
   from Admin > Settings. */

(async () => {
  const list = document.getElementById('home-events');
  const status = document.getElementById('home-events-status');

  function part(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // One event as a ruled row: date block, title and details, and an arrow.
  // The whole row is the link's target area; the date block is read out once,
  // in full, from the hidden text beside the title.
  function eventRow(event) {
    const [year, month, day] = event.event_date.slice(0, 10).split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const item = part('li', 'event-row');

    const block = part('span', 'date-block');
    block.setAttribute('aria-hidden', 'true');
    block.append(
      part('span', 'date-day', String(day)),
      part('span', 'date-month', date.toLocaleDateString('en-GB', { month: 'short' })),
    );

    const body = part('div', 'event-row-body');
    const title = part('h3', 'event-row-title');
    const link = part('a', 'event-row-link', event.title);
    link.href = `events.html#event-${event.id}`;
    title.append(link);

    const details = part('p', 'event-meta');
    details.append(part('span', 'visually-hidden', `${window.rtwc.formatDate(event.event_date)}. `));
    details.append([event.event_time && window.rtwc.formatTime(event.event_time), event.location]
      .filter(Boolean)
      .join(', '));
    body.append(title, details);

    const arrow = part('span', 'row-arrow');
    arrow.setAttribute('aria-hidden', 'true');

    item.append(block, body, arrow);
    return item;
  }

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

    list.replaceChildren(...events.map(eventRow));
    status.textContent = '';
  } catch (error) {
    console.error('Could not load upcoming events.', error);
    status.textContent = 'Events could not be loaded. Please try again later.';
  }
})();

// The featured verse band shows only when both the text and the reference are
// filled in and are not the "[ADD: ...]" placeholders the migration leaves.
(async () => {
  const band = document.getElementById('featured-verse');
  const values = await window.rtwc.settings;
  if (!band || !values) return;

  const text = (values.featured_verse_text || '').trim();
  const reference = (values.featured_verse_ref || '').trim();
  const isPlaceholder = value => /^\[ADD:/i.test(value);
  if (!text || !reference || isPlaceholder(text) || isPlaceholder(reference)) return;

  document.getElementById('featured-verse-text').textContent = text;
  document.getElementById('featured-verse-ref').textContent = reference;
  band.hidden = false;
})();
