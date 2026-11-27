/* Home page: the ministries from Admin > Ministries, the next three events from
   the events API, the newest sermon from Admin > Sermons, and the featured verse
   from Admin > Settings. */

// The ministries index: number, name and description, each a link to its place
// on the Ministries page (ministries.html#slug).
(async () => {
  const list = document.getElementById('home-ministries');
  const status = document.getElementById('home-ministries-status');
  if (!list || !status) return;

  function span(className, text) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }

  try {
    const ministries = await window.rtwc.getJSON('/api/ministries');
    if (!Array.isArray(ministries)) throw new Error('/api/ministries did not return a list.');
    if (ministries.length === 0) {
      status.textContent = 'No ministries to show yet.';
      return;
    }

    list.replaceChildren(...ministries.map(ministry => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `ministries.html#${encodeURIComponent(ministry.slug)}`;
      link.append(span('ministry-index-name', ministry.name));
      if (ministry.description) link.append(' ', span('ministry-index-text', ministry.description));
      item.append(link);
      return item;
    }));
    status.textContent = '';
  } catch (error) {
    console.error('Could not load the ministries.', error);
    status.textContent = 'The ministries could not be loaded. Please try again later.';
  }
})();

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

// The newest sermon: title, speaker, date and a watch link. With no sermons, or
// when the API cannot be reached, the band keeps its built-in text.
(async () => {
  const latest = document.getElementById('home-sermon-latest');
  const status = document.getElementById('home-sermon-status');
  if (!latest || !status) return;

  try {
    const data = await window.rtwc.getJSON('/api/sermons?page=1&limit=1');
    const sermon = data && Array.isArray(data.items) ? data.items[0] : null;
    if (!sermon) return;

    const title = document.createElement('h3');
    title.textContent = sermon.title;

    const details = document.createElement('p');
    details.className = 'event-meta';
    details.textContent = [sermon.speaker, sermon.sermon_date && window.rtwc.formatDate(sermon.sermon_date)]
      .filter(Boolean)
      .join(', ');
    latest.replaceChildren(title, details);

    const url = typeof sermon.video_url === 'string' ? sermon.video_url.trim() : '';
    if (/^https?:\/\/[^\s<>"'`]+$/i.test(url)) {
      const watch = document.createElement('a');
      watch.className = 'link-arrow';
      watch.href = url;
      watch.rel = 'noopener noreferrer';
      watch.textContent = `Watch "${sermon.title}"`;
      const line = document.createElement('p');
      line.append(watch);
      latest.append(line);
    }

    latest.hidden = false;
    status.hidden = true;
  } catch (error) {
    console.error('Could not load the newest sermon.', error);
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
