/* Ministries page: every ministry from Admin > Ministries (GET /api/ministries),
   in the order set there. Each article's id is the ministry's slug, so a link such
   as ministries.html#choir opens that ministry. All text is set with textContent. */

(async () => {
  const list = document.getElementById('ministry-list');
  const status = document.getElementById('ministries-status');

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // A fact the church has not filled in yet, marked the same way as elsewhere on the site.
  function toAdd(text) {
    return make('span', 'to-add', text);
  }

  // One leader's row: photo (or the grey photo slot), name and role.
  function leaderRow(leader) {
    const item = make('li', 'ministry-leader');
    if (leader.photo_url) {
      const photo = make('img', 'ministry-leader-photo');
      photo.src = leader.photo_url;
      photo.alt = ''; // the name is written beside it
      photo.width = 64;
      photo.height = 64;
      photo.loading = 'lazy';
      item.append(photo);
    } else {
      const slot = make('span', 'photo-slot ministry-leader-photo', 'No photo');
      slot.setAttribute('aria-hidden', 'true');
      item.append(slot);
    }
    const text = make('span', 'ministry-leader-text');
    text.append(make('span', 'ministry-leader-name', leader.name), make('span', 'ministry-leader-role', leader.role_label));
    item.append(text);
    return item;
  }

  // "Led by" and one row per leader, in the order set in Admin > Leadership.
  function ledBy(ministry, leaders) {
    const block = make('div', 'ministry-leaders');
    const label = make('p', 'ministry-leaders-label', 'Led by');
    label.id = `${ministry.slug}-leaders`;
    const list = make('ul', 'ministry-leader-list');
    list.setAttribute('aria-labelledby', label.id);
    list.append(...leaders.map(leaderRow));
    block.append(label, list);
    return block;
  }

  function ministryArticle(ministry) {
    const article = make('article', 'ministry');
    article.id = ministry.slug;

    if (ministry.icon_url) {
      const icon = make('img', 'ministry-icon');
      icon.src = ministry.icon_url;
      icon.alt = '';
      icon.width = 48;
      icon.height = 48;
      icon.loading = 'lazy';
      article.append(icon);
    }

    article.append(make('h2', '', ministry.name));
    if (ministry.description) article.append(make('p', '', ministry.description));

    const leaders = Array.isArray(ministry.leaders) ? ministry.leaders : [];
    if (leaders.length) article.append(ledBy(ministry, leaders));

    const details = make('p');
    details.append('Meets: ', ministry.meeting_time ? ministry.meeting_time : toAdd('[ADD: day and time]'));
    article.append(details);
    return article;
  }

  try {
    const ministries = await window.rtwc.getJSON('/api/ministries');
    if (!Array.isArray(ministries)) throw new Error('/api/ministries did not return a list.');
    if (ministries.length === 0) {
      status.textContent = 'No ministries to show yet.';
      return;
    }

    list.append(...ministries.map(ministryArticle));
    status.textContent = '';

    // The articles did not exist when the page loaded, so the browser could not
    // jump to ministries.html#slug by itself.
    const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target) target.scrollIntoView();
  } catch (error) {
    console.error('Could not load the ministries.', error);
    status.textContent = 'The ministries could not be loaded. Please try again later.';
  }
})();
