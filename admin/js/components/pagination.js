/**
 * admin/js/components/pagination.js: "Showing 21 to 40 of 53" with Previous and Next.
 *
 * createPagination({ label, onChange(page) }) returns { element, update(meta) }.
 * meta is the API's pagination object: { page, limit, total, totalPages }.
 * The element hides itself when everything fits on one page.
 */
import { el } from './dom.js';

export function createPagination({ label, onChange }) {
  let current = 1;
  const summary = el('p', { class: 'pagination-summary', role: 'status' });
  const position = el('span');
  const previous = el('button', { class: 'button button-secondary', type: 'button', text: 'Previous', onclick: () => onChange(current - 1) });
  const next = el('button', { class: 'button button-secondary', type: 'button', text: 'Next', onclick: () => onChange(current + 1) });
  const element = el('nav', { class: 'pagination', 'aria-label': label || 'Pages', hidden: true },
    summary,
    el('div', { class: 'pagination-controls' }, previous, position, next));

  return {
    element,
    update({ page, limit, total, totalPages }) {
      current = page;
      element.hidden = totalPages <= 1;
      const first = (page - 1) * limit + 1;
      const last = Math.min(page * limit, total);
      summary.textContent = `Showing ${first} to ${last} of ${total}`;
      position.textContent = `Page ${page} of ${totalPages}`;
      previous.disabled = page <= 1;
      next.disabled = page >= totalPages;
    },
  };
}
