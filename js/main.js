/* Runs on every public page: footer year, mobile menu, the church details
   (address, phone, email, service times, mission, vision) saved in Admin > Settings,
   and the site announcement bar. */

(() => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const menuButton = document.getElementById('menu-button');
  const menu = document.getElementById('site-menu');

  function setMenuOpen(open) {
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  }

  menuButton.addEventListener('click', () => setMenuOpen(!menu.classList.contains('is-open')));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenuOpen(false);
      menuButton.focus();
    }
  });

  // Dates from the API arrive as YYYY-MM-DD. Building the Date from its parts keeps
  // the day from shifting in time zones behind GMT.
  function formatDate(isoDate) {
    const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // "6:30 PM - 9:00 PM" becomes "6:30 pm to 9:00 pm".
  function formatTime(text) {
    return text
      .replace(/(\d)\s*([ap])\.?m\b\.?/gi, (match, digit, letter) => `${digit} ${letter.toLowerCase()}m`)
      .replace(/\s*[-–—]\s*/g, ' to ');
  }

  // The pages keep their built-in text when the API is not running.
  const settings = fetch('/api/settings', { headers: { Accept: 'application/json' } })
    .then(response => (response.ok ? response.json() : null))
    .then(payload => (payload && payload.success ? payload.data : null))
    .catch(() => null);

  // "Sunday worship service: 8:00 am to 11:30 am" becomes a row with the name as
  // its label and the time as its value. A line without a colon stays one piece.
  function listRow(line) {
    const item = document.createElement('li');
    const split = line.indexOf(': ');
    if (split < 1) {
      item.textContent = line;
      return item;
    }
    const label = document.createElement('span');
    label.className = 'info-label';
    label.textContent = line.slice(0, split);
    const value = document.createElement('span');
    value.className = 'info-value';
    value.textContent = line.slice(split + 2);
    item.append(label, ' ', value);
    return item;
  }

  // The next service from the service times: the first line that names a weekday
  // and has a start time still ahead. Lines without a weekday are skipped; if none
  // name one, the first line is shown.
  const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function nextService(lines, now = new Date()) {
    let best = null;
    lines.forEach(line => {
      const day = WEEKDAYS.findIndex(name => line.toLowerCase().includes(name));
      if (day === -1) return;
      const time = line.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m/i);
      const hours = time ? Number(time[1]) % 12 + (time[3].toLowerCase() === 'p' ? 12 : 0) : 0;
      const minutes = time && time[2] ? Number(time[2]) : 0;
      let ahead = (day - now.getDay() + 7) % 7;
      const startsToday = ahead === 0 && (hours * 60 + minutes) > (now.getHours() * 60 + now.getMinutes());
      if (ahead === 0 && !startsToday) ahead = 7;
      const score = ahead * 1440 + hours * 60 + minutes;
      if (!best || score < best.score) best = { line, score };
    });
    return best ? best.line : lines[0] || '';
  }

  function showNextService(lines) {
    const line = nextService(lines.map(text => text.trim()).filter(Boolean));
    if (!line) return;
    document.querySelectorAll('[data-next-service]').forEach(element => {
      element.textContent = line.replace(': ', ', ');
    });
  }

  settings.then(values => {
    const times = values && (values.service_times || '').trim();
    if (times) showNextService(times.split('\n'));
    else {
      const list = document.querySelector('.service-times');
      if (list) {
        showNextService([...list.children].map(item => {
          const label = item.querySelector('.info-label');
          const value = item.querySelector('.info-value');
          return label && value ? `${label.textContent}: ${value.textContent}` : item.textContent;
        }));
      }
    }
  });

  settings.then(values => {
    if (!values) return;
    document.querySelectorAll('[data-setting]').forEach(element => {
      const value = (values[element.dataset.setting] || '').trim();
      if (!value) return;

      if (element.tagName === 'UL') {
        element.replaceChildren(...value.split('\n').filter(line => line.trim()).map(line => listRow(line.trim())));
        return;
      }

      element.textContent = value;
      element.classList.remove('to-add');
      if (element.dataset.link === 'tel:') element.href = `tel:${value.replace(/[^\d+]/g, '')}`;
      if (element.dataset.link === 'mailto:') element.href = `mailto:${value}`;
    });
  });

  // The site announcement from Admin > Settings: a navy bar above the header while
  // it is switched on and has text. Dismissing it hides it for the rest of the
  // visit. A different announcement shows again.
  const DISMISSED_KEY = 'rtwc_announcement_dismissed';

  function safeLink(value) {
    return /^https?:\/\/[^\s<>"'`]+$/i.test(value) || /^\/(?!\/)[^\s<>"'`]*$/.test(value) ? value : '';
  }

  function readDismissed() {
    try { return sessionStorage.getItem(DISMISSED_KEY); } catch (error) { return null; }
  }

  function saveDismissed(value) {
    try { sessionStorage.setItem(DISMISSED_KEY, value); } catch (error) { /* hidden until the next page */ }
  }

  settings.then(values => {
    if (!values || values.announcement_enabled !== '1') return;
    const text = (values.announcement_text || '').trim();
    const header = document.querySelector('.site-header');
    if (!text || !header) return;

    const link = safeLink((values.announcement_link || '').trim());
    const signature = `${text}\n${link}`;
    if (readDismissed() === signature) return;

    const bar = document.createElement('div');
    bar.className = 'announcement';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Announcement');

    const inner = document.createElement('div');
    inner.className = 'wrap announcement-inner';

    const message = document.createElement('p');
    message.className = 'announcement-text';
    message.textContent = text;
    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.textContent = 'Find out more';
      message.append(' ', anchor);
    }

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'announcement-dismiss';
    dismiss.textContent = 'Dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss announcement');
    dismiss.addEventListener('click', () => {
      saveDismissed(signature);
      bar.remove();
      // Focus moves to the next thing on the page, the church name in the header,
      // instead of falling back to the top of the document.
      const next = header.querySelector('a');
      if (next) next.focus();
    });

    inner.append(message, dismiss);
    bar.append(inner);
    header.before(bar);
  });

  window.rtwc = { settings, formatDate, formatTime };
})();
