// BACKEND REMOVED — see ministries previously called /api/ministries. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Ministries Page Specific JavaScript (js/pages/ministries.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Expandable Ministry Details Handler
  const expandBtns = document.querySelectorAll('.btn-expand-ministry');

  expandBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.ministry-card');
      const isExpanded = card.classList.contains('expanded');

      if (!isExpanded) {
        card.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
        btn.querySelector('span').textContent = 'Hide Details';
      } else {
        card.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
        btn.querySelector('span').textContent = 'Learn More Details';
      }
    });
  });
});
