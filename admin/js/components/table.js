/**
 * admin/js/components/table.js: the data table panel.
 *
 * createTable({
 *   caption,            what the table lists, read by screen readers
 *   columns: [{
 *     key,              the row property shown when there is no render()
 *     label,            the column heading
 *     numeric,          true to right-align
 *     wrap,             true for long text that may break onto more lines
 *     rowHeader,        true on the one column that names the row
 *     sub(row),         optional, on the row header: a muted second line of text under the name
 *     render(row),      returns a node or a string. Strings are placed as text
 *   }],
 *   actions(row),       returns [{ label, name, onClick, danger, disabled, hint }] for the last column.
 *                       name is what the row is called, read out after the label by screen readers.
 *                       hint is shown as text beside the button, to say why it is disabled
 *   onRowClick(row),    makes the row-header cell a button that opens the row
 *   empty: { text, action }   action is { label, onClick }
 * })
 *
 * Returns { element, showLoading(), showRows(rows), showError(message, onRetry), footer }.
 * `footer` is where a page puts its pagination.
 */
import { el } from './dom.js';
import { showLoading, showEmpty, showError } from './states.js';

export function createTable({ caption, columns, actions, onRowClick, empty }) {
  const headRow = el('tr');
  columns.forEach((column) => {
    headRow.append(el('th', { scope: 'col', class: column.numeric ? 'is-numeric' : null, text: column.label }));
  });
  if (actions) headRow.append(el('th', { scope: 'col', class: 'cell-actions', text: 'Actions' }));

  const body = el('tbody');
  const table = el('table', { class: 'data-table' },
    el('caption', { class: 'visually-hidden', text: caption }),
    el('thead', {}, headRow),
    body);
  // Focusable so a keyboard user can scroll a table wider than the panel.
  const scroll = el('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': caption }, table);
  const state = el('div');
  const footer = el('div');
  const element = el('div', { class: 'panel' }, scroll, state, footer);

  function show(which) {
    scroll.hidden = which !== 'rows';
    state.hidden = which === 'rows';
    footer.hidden = which !== 'rows';
  }

  function buildCell(column, row) {
    const content = column.render ? column.render(row) : row[column.key];
    const value = content === null || content === undefined ? '' : content;
    const classes = [column.numeric ? 'is-numeric' : '', column.wrap ? 'cell-wrap' : ''].filter(Boolean).join(' ') || null;

    if (!column.rowHeader) return el('td', { class: classes }, value);
    // A second line under the row's name, outside its button, such as an email address.
    const sub = column.sub ? column.sub(row) : '';
    // An email address may break after its @, never in the middle of a word.
    const subParts = String(sub).split('@');
    const subLine = sub
      ? el('span', { class: 'cell-sub' }, ...subParts.flatMap((part, i) => (i === 0 ? [part] : ['@', el('wbr'), part])))
      : null;
    if (!onRowClick) return el('th', { scope: 'row', class: classes }, value, subLine);
    return el('th', { scope: 'row', class: classes },
      el('button', { class: 'link-button', type: 'button', onclick: () => onRowClick(row) }, value), subLine);
  }

  function buildActions(row) {
    const cell = el('td', { class: 'cell-actions' });
    actions(row).forEach((action) => {
      cell.append(el('button', {
        class: action.danger ? 'link-button link-button-danger' : 'link-button',
        type: 'button',
        disabled: Boolean(action.disabled),
        onclick: () => action.onClick(row),
        // A screen reader hears "Delete Easter sermon", not twenty plain "Delete"s.
      }, action.label, action.name ? el('span', { class: 'visually-hidden', text: ` ${action.name}` }) : null));
      // Why an action is switched off is written out, not left to a tooltip.
      if (action.hint) cell.append(el('span', { class: 'cell-hint', text: action.hint }));
    });
    return cell;
  }

  return {
    element,
    footer,
    showLoading() {
      show('state');
      showLoading(state);
    },
    showRows(rows) {
      if (rows.length === 0) {
        show('state');
        showEmpty(state, empty.text, empty.action);
        return;
      }
      body.replaceChildren(...rows.map((row) => {
        const tr = el('tr');
        columns.forEach((column) => tr.append(buildCell(column, row)));
        if (actions) tr.append(buildActions(row));
        return tr;
      }));
      show('rows');
    },
    showError(message, onRetry) {
      show('state');
      showError(state, message, onRetry);
    },
  };
}
