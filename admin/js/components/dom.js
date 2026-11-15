/* Shared admin components: small helpers the others build on.
   Everything is attached to window.AdminUI. Load this file first. */

window.AdminUI = window.AdminUI || {};

(() => {
  /**
   * Builds an element. Text always goes in as text, never as HTML.
   *   el('button', { class: 'btn', type: 'button' }, 'Save')
   * `props` may hold attributes, `text`, `dataset`, and `on` (event listeners).
   * `children` may be a string, a node, or a list of either.
   */
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'on') Object.entries(value).forEach(([event, handler]) => node.addEventListener(event, handler));
      else if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, value);
    });
    [].concat(children).forEach((child) => {
      if (child === undefined || child === null || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  /** For the rare case where text must be placed inside an HTML string. */
  function escapeHTML(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** "2026-11-08" becomes "8 November 2026". Built from its parts so the day never shifts. */
  function formatDate(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = String(isoDate).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return '';
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  let nextId = 0;
  /** A page-unique id, for tying labels, hints and errors to inputs. */
  function uniqueId(prefix) {
    nextId += 1;
    return `${prefix}-${nextId}`;
  }

  /** A small rectangular status tag. The status is always written out, never colour alone. */
  function statusTag(text, kind = 'neutral') {
    return el('span', { class: `tag tag-${kind}`, text });
  }

  Object.assign(window.AdminUI, { el, escapeHTML, formatDate, uniqueId, statusTag });
})();
