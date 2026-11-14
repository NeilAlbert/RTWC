/* Runs on every public page: footer year, mobile menu, and the church details
   (address, phone, email, service times, mission, vision) saved in Admin > Settings. */

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

  settings.then(values => {
    if (!values) return;
    document.querySelectorAll('[data-setting]').forEach(element => {
      const value = (values[element.dataset.setting] || '').trim();
      if (!value) return;

      if (element.tagName === 'UL') {
        element.replaceChildren(...value.split('\n').filter(line => line.trim()).map(line => {
          const item = document.createElement('li');
          item.textContent = line.trim();
          return item;
        }));
        return;
      }

      element.textContent = value;
      element.classList.remove('to-add');
      if (element.dataset.link === 'tel:') element.href = `tel:${value.replace(/[^\d+]/g, '')}`;
      if (element.dataset.link === 'mailto:') element.href = `mailto:${value}`;
    });
  });

  window.rtwc = { settings, formatDate, formatTime };
})();
