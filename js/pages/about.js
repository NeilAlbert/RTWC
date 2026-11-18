/* About page: the Leadership section from Admin > Leadership (GET /api/leadership).
   The HTML already holds a placeholder for every group, so a group with nobody in
   it yet, or a failed request, leaves the page as it was. All text is set with
   textContent; each ministry leader links to ministries.html#slug. */

(async () => {
  const listElement = document.getElementById('leader-list');
  if (!listElement) return;

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  let groups;
  try {
    groups = await window.rtwc.getJSON('/api/leadership');
  } catch (error) {
    // The placeholders stay in place; nothing on the page depends on this.
    console.error('Could not load the leadership list.', error);
    return;
  }

  const everyone = Object.values(groups || {}).flat();
  const byRole = (roles) => everyone.filter((person) => roles.includes(person.role));

  // Resident Pastor: name, bio and photo in the profile card.
  const pastor = byRole(['pastor'])[0];
  if (pastor) {
    document.getElementById('pastor-name').textContent = pastor.name;
    const bio = document.getElementById('pastor-bio');
    if (pastor.bio) bio.textContent = pastor.bio;
    else bio.remove();
    const slot = document.getElementById('pastor-photo');
    if (pastor.photoUrl) {
      const photo = make('img', 'leader-photo');
      photo.src = pastor.photoUrl;
      photo.alt = `${pastor.name}, Resident Pastor`;
      photo.width = 320;
      photo.height = 400;
      slot.replaceWith(photo);
    }
  }

  // The pastor's wife has no placeholder of her own; her row is added only when she is listed.
  const wives = byRole(['pastors_wife']);
  if (wives.length) {
    const firstTerm = listElement.querySelector('dt');
    listElement.insertBefore(make('dt', '', "Pastor's Wife"), firstTerm);
    listElement.insertBefore(make('dd', '', wives.map((person) => person.name).join(', ')), firstTerm);
  }

  // Every other group: names in display order, separated by commas.
  listElement.querySelectorAll('dd[data-leaders]').forEach((cell) => {
    const roles = cell.dataset.leaders.split(' ');
    const people = byRole(roles);
    if (!people.length) return;

    if (roles.includes('ministry_leader')) {
      const names = make('ul', 'leader-ministries');
      names.append(...people.map((person) => {
        const item = make('li', '', person.name);
        if (person.ministry && person.ministrySlug) {
          const link = make('a', '', person.ministry);
          link.href = `ministries.html#${encodeURIComponent(person.ministrySlug)}`;
          item.append(', ', link);
        }
        return item;
      }));
      cell.replaceChildren(names);
      return;
    }

    cell.textContent = people.map((person) => person.name).join(', ');
  });
})();
