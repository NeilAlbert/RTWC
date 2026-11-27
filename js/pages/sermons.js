/* Sermons page: the sermons from Admin > Sermons (GET /api/sermons), newest first,
   20 at a time with a "Show more" button. The search box searches the title and the
   speaker on the server; the speaker list is built from the sermons loaded so far. */

(() => {
  const PAGE_SIZE = 20;
  const SEARCH_DELAY_MS = 300;

  const filters = document.getElementById('sermon-filters');
  const search = document.getElementById('sermon-search');
  const speaker = document.getElementById('sermon-speaker');
  const list = document.getElementById('sermon-list');
  const status = document.getElementById('sermon-status');
  const more = document.getElementById('sermon-more');
  if (!filters || !list || !status || !more) return;

  const speakers = new Set();
  let page = 0;
  let totalPages = 0;
  let request = 0; // a newer search makes the answer to an older one ignored
  let searchTimer = null;

  // Only ordinary web links are used as a "Watch" link.
  function watchUrl(value) {
    return typeof value === 'string' && /^https?:\/\/[^\s<>"'`]+$/i.test(value.trim()) ? value.trim() : '';
  }

  function sermonItem(sermon) {
    const item = document.createElement('li');
    item.className = 'event';

    const title = document.createElement('h3');
    title.textContent = sermon.title;

    const details = document.createElement('p');
    details.className = 'event-meta';
    details.textContent = [sermon.speaker, sermon.sermon_date && window.rtwc.formatDate(sermon.sermon_date)]
      .filter(Boolean)
      .join(', ');

    item.append(title, details);

    if (sermon.description) {
      const summary = document.createElement('p');
      summary.textContent = sermon.description;
      item.append(summary);
    }

    const url = watchUrl(sermon.video_url);
    if (url) {
      const watch = document.createElement('a');
      watch.href = url;
      watch.rel = 'noopener noreferrer';
      watch.textContent = `Watch "${sermon.title}"`;
      item.append(watch);
    }
    return item;
  }

  // New speakers are added to the list in alphabetical order; the chosen one stays chosen.
  function addSpeakers(sermons) {
    let added = false;
    sermons.forEach(sermon => {
      if (sermon.speaker && !speakers.has(sermon.speaker)) {
        speakers.add(sermon.speaker);
        added = true;
      }
    });
    if (!added) return;
    const chosen = speaker.value;
    speaker.replaceChildren(new Option('All speakers', ''), ...[...speakers].sort().map(name => new Option(name, name)));
    speaker.value = chosen;
  }

  function query(nextPage) {
    const params = new URLSearchParams({ page: String(nextPage), limit: String(PAGE_SIZE) });
    const text = search.value.trim();
    if (text) params.set('q', text);
    if (speaker.value) params.set('speaker', speaker.value);
    return `/api/sermons?${params}`;
  }

  async function load(nextPage) {
    const thisRequest = ++request;
    const searching = Boolean(search.value.trim() || speaker.value);
    more.disabled = true;
    if (nextPage === 1) status.textContent = 'Loading the sermons.';

    try {
      const data = await window.rtwc.getJSON(query(nextPage));
      if (thisRequest !== request) return;
      if (!data || !Array.isArray(data.items) || !data.pagination) throw new Error('/api/sermons returned an invalid response.');

      page = data.pagination.page;
      totalPages = data.pagination.totalPages;
      addSpeakers(data.items);
      const items = data.items.map(sermonItem);
      if (nextPage === 1) list.replaceChildren(...items);
      else list.append(...items);

      if (data.pagination.total === 0) {
        status.textContent = searching ? 'No sermons match your search.' : 'No sermons have been posted here yet.';
      } else {
        status.textContent = '';
        filters.hidden = false;
      }
      more.hidden = page >= totalPages;
    } catch (error) {
      if (thisRequest !== request) return;
      console.error('Could not load the sermons.', error);
      if (nextPage === 1) list.replaceChildren();
      more.hidden = true;
      status.textContent = 'The sermons could not be loaded. Please try again later, or watch recent services on Facebook.';
    } finally {
      if (thisRequest === request) more.disabled = false;
    }
  }

  filters.addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(searchTimer);
    load(1);
  });
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => load(1), SEARCH_DELAY_MS);
  });
  speaker.addEventListener('change', () => load(1));
  more.addEventListener('click', () => load(page + 1));

  load(1);
})();
