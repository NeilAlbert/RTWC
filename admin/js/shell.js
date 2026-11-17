/**
 * admin/js/shell.js: the sidebar and top bar on every signed-in page.
 *
 * A page marks itself on <body>: data-page="sermons" names the current sidebar
 * link and data-title="Sermons" is the top bar title. The shell draws itself when
 * this file is loaded. Below 1024px the sidebar is an overlay opened by "Menu".
 *
 * loadStats() returns the result of GET /api/admin/stats, fetched once per page
 *   and shared with the dashboard.
 * refreshCounts() fetches it again and updates the unread counts in the sidebar.
 */
import { el } from './components/dom.js';
import { api } from './adminApi.js';

const GROUPS = [
  { links: [{ key: 'dashboard', label: 'Dashboard' }] },
  {
    heading: 'Content',
    links: [
      { key: 'sermons', label: 'Sermons' },
      { key: 'events', label: 'Events' },
      { key: 'ministries', label: 'Ministries' },
      { key: 'leadership', label: 'Leadership' },
      { key: 'media', label: 'Media' },
    ],
  },
  {
    heading: 'Inbox',
    links: [
      { key: 'messages', label: 'Messages', count: 'newMessages' },
      { key: 'prayer-requests', label: 'Prayer Requests', count: 'newPrayerRequests' },
      { key: 'newsletter', label: 'Newsletter' },
    ],
  },
  {
    heading: 'Site',
    links: [
      { key: 'settings', label: 'Settings' },
      { key: 'status', label: 'Site status' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { key: 'account', label: 'Account' },
      { key: 'help', label: 'Help' },
    ],
  },
];

const desktop = window.matchMedia('(min-width: 1024px)');
const countNodes = {};
let statsRequest = null;

export function loadStats() {
  if (!statsRequest) statsRequest = api.get('/admin/stats');
  return statsRequest;
}

function showCounts(stats) {
  Object.entries(countNodes).forEach(([key, node]) => {
    const total = Number(stats[key]) || 0;
    node.hidden = total === 0;
    node.replaceChildren(String(total), el('span', { class: 'visually-hidden', text: ' new' }));
  });
}

export async function refreshCounts() {
  statsRequest = null;
  const result = await loadStats();
  // The counts are an extra. When they cannot load, each page reports its own errors.
  if (result.ok) showCounts(result.data);
  return result;
}

function buildSidebar(sidebar, currentPage) {
  const nav = el('nav', { class: 'sidebar-nav', 'aria-label': 'Admin' });
  GROUPS.forEach((group) => {
    const list = el('ul');
    group.links.forEach((link) => {
      const anchor = el('a', {
        class: 'sidebar-link',
        href: `/admin/${link.key}.html`,
        'aria-current': link.key === currentPage ? 'page' : null,
      }, el('span', { text: link.label }));
      if (link.count) {
        countNodes[link.count] = el('span', { class: 'sidebar-count', hidden: true });
        anchor.append(countNodes[link.count]);
      }
      list.append(el('li', {}, anchor));
    });
    nav.append(el('div', { class: 'sidebar-group' },
      group.heading ? el('h2', { class: 'sidebar-heading', text: group.heading }) : null,
      list));
  });

  const logout = el('button', { class: 'sidebar-link', type: 'button', text: 'Log out' });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    // Tells the server to retire the token. The browser forgets it either way.
    await api.post('/auth/logout');
    window.AdminAuth.endSession('logged-out');
  });

  sidebar.replaceChildren(
    el('div', { class: 'sidebar-brand' },
      el('p', { class: 'sidebar-church', text: 'Royal Temple Worship Centre' }),
      el('p', { class: 'sidebar-denomination', text: 'The Church of Pentecost' })),
    nav,
    el('div', { class: 'sidebar-footer' },
      el('a', { class: 'sidebar-link', href: '/', text: 'View website' }),
      logout));
}

/** The overlay sidebar: opens from "Menu", holds focus, closes on Escape or a click outside. */
function setUpMenu(sidebar, menuButton) {
  const scrim = el('div', { class: 'sidebar-scrim', hidden: true });
  sidebar.after(scrim);

  function close({ returnFocus = true } = {}) {
    if (!sidebar.classList.contains('is-open')) return;
    sidebar.classList.remove('is-open');
    scrim.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  }

  function open() {
    sidebar.classList.add('is-open');
    scrim.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    sidebar.querySelector('a, button').focus();
  }

  menuButton.addEventListener('click', open);
  scrim.addEventListener('click', () => close());
  desktop.addEventListener('change', () => close({ returnFocus: false }));

  sidebar.addEventListener('keydown', (event) => {
    if (!sidebar.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = sidebar.querySelectorAll('a, button');
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function init() {
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  if (!sidebar || !topbar) return;

  buildSidebar(sidebar, document.body.dataset.page || '');

  const menuButton = el('button', {
    class: 'button button-secondary menu-button',
    type: 'button',
    text: 'Menu',
    'aria-expanded': 'false',
    'aria-controls': 'sidebar',
  });
  topbar.replaceChildren(menuButton, el('p', { class: 'topbar-title', text: document.body.dataset.title || '' }));
  setUpMenu(sidebar, menuButton);

  loadStats().then((result) => {
    if (result.ok) showCounts(result.data);
  });
}

init();
