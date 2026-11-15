/* Shared admin components: the data table and its pagination.
   The table shows one of four states: loading (flat grey rows), rows, empty
   (a sentence and the main action), or error (a banner with "Try again"). */

(() => {
  const { el } = window.AdminUI;
  const SKELETON_ROWS = 5;

  /**
   * @param {object} options
   * @param {string} options.label  what the table lists, for screen readers
   * @param {Array<{label: string, render: Function, numeric?: boolean, actions?: boolean}>} options.columns
   *        render(row) returns text or a node. Text is always inserted as text.
   * @param {Function} [options.onRowClick]  called with the row when it is clicked. The row must
   *        also have a button that does the same thing, for people using a keyboard.
   */
  function createTable({ label, columns, onRowClick }) {
    const tbody = el('tbody');
    const table = el('table', { class: 'data-table' }, [
      el('caption', { class: 'visually-hidden', text: label }),
      el('thead', {}, el('tr', {}, columns.map((column) => el('th', {
        scope: 'col',
        class: column.numeric ? 'is-numeric' : (column.actions ? 'is-actions' : ''),
        text: column.label,
      })))),
      tbody,
    ]);
    const scroll = el('div', { class: 'table-scroll', tabindex: '0', role: 'group', 'aria-label': label }, table);
    const state = el('div', { class: 'table-state', hidden: true });
    const panel = el('div', { class: 'table-panel' }, [scroll, state]);

    function show(part) {
      scroll.hidden = part !== 'table';
      state.hidden = part !== 'state';
    }

    function showLoading() {
      table.setAttribute('aria-busy', 'true');
      tbody.replaceChildren(...Array.from({ length: SKELETON_ROWS }, () => el('tr', { class: 'skeleton-row' },
        columns.map(() => el('td', {}, el('span', { class: 'skeleton' }))))));
      show('table');
    }

    function showRows(rows) {
      table.removeAttribute('aria-busy');
      tbody.replaceChildren(...rows.map((row) => el('tr', {
        class: onRowClick ? 'is-clickable' : '',
        // A click on a button or link inside the row is that control's own business.
        on: onRowClick ? { click: (event) => { if (!event.target.closest('button, a')) onRowClick(row); } } : {},
      }, columns.map((column) => el('td', {
        class: column.numeric ? 'is-numeric' : (column.actions ? 'is-actions' : ''),
        dataset: { label: column.label },
      }, column.render(row))))));
      show('table');
    }

    /** One plain sentence and, when given, the page's main action. */
    function showEmpty(text, action) {
      table.removeAttribute('aria-busy');
      state.replaceChildren(el('p', { text }), action || '');
      show('state');
    }

    /** A banner with the reason and a button that tries the load again. */
    function showError(message, onRetry) {
      table.removeAttribute('aria-busy');
      state.replaceChildren(el('div', { class: 'alert alert-error visible', role: 'alert' }, [
        el('p', { text: message }),
        el('button', { type: 'button', class: 'btn btn-outline', text: 'Try again', on: { click: onRetry } }),
      ]));
      show('state');
    }

    return { element: panel, showLoading, showRows, showEmpty, showError };
  }

  /** Page numbers to offer: first, last, and those next to the current page. null marks a gap. */
  function pageList(current, last) {
    const wanted = new Set([1, last, current - 1, current, current + 1]);
    const pages = [...wanted].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
    const list = [];
    pages.forEach((page, index) => {
      if (index > 0 && page - pages[index - 1] > 1) list.push(null);
      list.push(page);
    });
    return list;
  }

  /**
   * "Showing 21 to 40 of 130", Previous, page numbers, Next.
   * @param {Function} onPage  called with the page number to load
   */
  function createPagination(onPage) {
    const summary = el('p', { class: 'pagination-summary' });
    const buttons = el('div', { class: 'pagination-buttons' });
    const nav = el('nav', { class: 'pagination', 'aria-label': 'Pages', hidden: true }, [summary, buttons]);

    function pageButton(text, page, { current = false, disabled = false, label } = {}) {
      return el('button', {
        type: 'button',
        class: current ? 'page-button is-current' : 'page-button',
        text,
        disabled,
        'aria-current': current ? 'page' : null,
        'aria-label': label,
        on: { click: () => onPage(page) },
      });
    }

    function update({ page, limit, total }) {
      nav.hidden = total === 0;
      if (total === 0) return;

      const last = Math.max(1, Math.ceil(total / limit));
      const from = (page - 1) * limit + 1;
      const to = Math.min(page * limit, total);
      summary.textContent = `Showing ${from} to ${to} of ${total}`;

      buttons.replaceChildren(
        pageButton('Previous', page - 1, { disabled: page <= 1 }),
        ...pageList(page, last).map((number) => (number === null
          ? el('span', { class: 'page-gap', text: '...' })
          : pageButton(String(number), number, { current: number === page, label: `Page ${number}` }))),
        pageButton('Next', page + 1, { disabled: page >= last })
      );
    }

    return { element: nav, update };
  }

  Object.assign(window.AdminUI, { createTable, createPagination });
})();
