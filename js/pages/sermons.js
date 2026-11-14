/* Sermons page.

   ADD: list each sermon in the array below. Nothing is shown until it has entries.
   Example entry:
     {
       title: 'Title of the sermon',
       speaker: 'Name of the preacher',
       date: '2026-11-08',            // year-month-day
       service: 'Sunday worship',
       summary: 'One or two sentences about the message.',
       url: 'https://www.facebook.com/cop.rtwc/videos/...'   // where to watch it
     }
*/
const sermons = [];

(() => {
  if (sermons.length === 0) return;

  const filters = document.getElementById('sermon-filters');
  const search = document.getElementById('sermon-search');
  const speaker = document.getElementById('sermon-speaker');
  const service = document.getElementById('sermon-category');
  const list = document.getElementById('sermon-list');
  const status = document.getElementById('sermon-status');

  function addOptions(select, values) {
    [...new Set(values)].sort().forEach(value => select.add(new Option(value, value)));
  }

  function showSermons() {
    const query = search.value.trim().toLowerCase();
    const matches = sermons
      .filter(sermon =>
        (!speaker.value || sermon.speaker === speaker.value) &&
        (!service.value || sermon.service === service.value) &&
        [sermon.title, sermon.speaker, sermon.summary].join(' ').toLowerCase().includes(query))
      .sort((a, b) => b.date.localeCompare(a.date));

    list.replaceChildren(...matches.map(sermon => {
      const item = document.createElement('li');
      item.className = 'event';

      const title = document.createElement('h3');
      title.textContent = sermon.title;

      const details = document.createElement('p');
      details.className = 'event-meta';
      details.textContent = [sermon.speaker, window.rtwc.formatDate(sermon.date), sermon.service]
        .filter(Boolean)
        .join(', ');

      const summary = document.createElement('p');
      summary.textContent = sermon.summary;

      item.append(title, details, summary);

      if (sermon.url) {
        const watch = document.createElement('a');
        watch.href = sermon.url;
        watch.textContent = `Watch "${sermon.title}"`;
        item.append(watch);
      }
      return item;
    }));

    status.textContent = matches.length === 0 ? 'No sermons match your search.' : '';
  }

  addOptions(speaker, sermons.map(sermon => sermon.speaker));
  addOptions(service, sermons.map(sermon => sermon.service));
  filters.hidden = false;
  filters.addEventListener('submit', event => event.preventDefault());
  filters.addEventListener('input', showSermons);
  showSermons();
})();
