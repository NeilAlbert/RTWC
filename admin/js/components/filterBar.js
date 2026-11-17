/**
 * admin/js/components/filterBar.js: the row of search and filter controls above a table.
 *
 * createFilterBar({
 *   search:  { label, onSearch(text) }                       optional
 *   filters: [{ label, options: [{ value, label }], value, onChange(value) }]
 * })
 * Typing in the search box calls onSearch 300ms after the last key press.
 * Returns { element }.
 */
import { el, uid, debounce } from './dom.js';

function labelled(label, control) {
  return el('div', { class: 'field' }, el('label', { class: 'field-label', for: control.id, text: label }), control);
}

export function createFilterBar({ search, filters = [] }) {
  const element = el('div', { class: 'filter-bar' });

  if (search) {
    const run = debounce((text) => search.onSearch(text.trim()), 300);
    const input = el('input', {
      class: 'input',
      type: 'search',
      id: uid('search'),
      maxlength: '200',
      autocomplete: 'off',
      oninput: (event) => run(event.target.value),
    });
    element.append(labelled(search.label, input));
  }

  filters.forEach((filter) => {
    const select = el('select', { class: 'input', id: uid('filter'), onchange: (event) => filter.onChange(event.target.value) });
    filter.options.forEach((option) => {
      select.append(el('option', { value: option.value, text: option.label, selected: option.value === filter.value }));
    });
    element.append(labelled(filter.label, select));
  });

  return { element };
}
