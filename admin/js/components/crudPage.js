/**
 * admin/js/components/crudPage.js: a list page with add, edit and delete.
 * Sermons, Events, Ministries and Leadership are each one call to this.
 *
 * createCrudPage({
 *   root,              element the filter bar, messages and table are put in
 *   addButton,         the page header's primary button
 *   endpoint,          for example '/admin/sermons'
 *   noun,              'sermon'. Used in "Add sermon", "Sermon saved." and so on
 *   nameOf(row),       what to call a row in messages, for example its title
 *   caption,           what the table lists, for screen readers
 *   columns,           see table.js
 *   emptyText(state),  the sentence shown when the list is empty
 *   search,            { label } to show a search box (sent as ?q=)
 *   filters,           [{ name, label, options, value }], each sent as ?name=value
 *   fields(row),       field configs or built fields for the form. row is null when adding
 *   onFormReady(form, row),   optional. For wiring one field to another
 *   toBody(values),    optional. Turns the form's values into what is sent
 *   onChange(),        optional. Called after anything is saved or deleted
 * })
 * Returns { reload() }.
 *
 * Every delete asks first. A save or delete the server refuses is reported on
 * the page (beside the field, in the form's banner, or above the table), and a
 * toast only confirms what worked.
 */
import { el } from './dom.js';
import { api, query } from '../adminApi.js';
import { createTable } from './table.js';
import { createPagination } from './pagination.js';
import { createFilterBar } from './filterBar.js';
import { createForm } from './form.js';
import { openDialog, confirmDialog } from './dialog.js';
import { toast } from './toast.js';

const PAGE_SIZE = 20;

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function createCrudPage(config) {
  const {
    root, addButton, endpoint, noun, nameOf, caption, columns, emptyText, search, filters = [], fields, onFormReady, toBody, onChange,
  } = config;

  const state = { page: 1, q: '' };
  filters.forEach((filter) => { state[filter.name] = filter.value; });

  // Shown above the table when a delete is refused or fails.
  const problem = el('div', { class: 'banner banner-error page-problem', role: 'alert', hidden: true });

  function showProblem(message) {
    problem.textContent = message;
    problem.hidden = !message;
  }

  function openForm(row) {
    const form = createForm({
      sticky: true,
      submitLabel: row ? 'Save changes' : `Add ${noun}`,
      fields: fields(row),
      onCancel: () => dialog.close(),
      async onSubmit(values) {
        const body = toBody ? toBody(values) : values;
        const result = row ? await api.put(`${endpoint}/${row.id}`, body) : await api.post(endpoint, body);
        if (!result.ok) return result;
        dialog.forceClose();
        toast(`${capitalise(noun)} ${row ? 'saved' : 'added'}.`);
        if (!row) state.page = 1;
        load();
        if (onChange) onChange();
        return result;
      },
    });
    if (onFormReady) onFormReady(form, row);
    form.markClean();

    const dialog = openDialog({
      title: row ? `Edit ${noun}` : `Add ${noun}`,
      body: form.element,
      wide: true,
      // Closing a form that has been changed asks first.
      canClose: () => !form.isDirty() || confirmDialog({
        title: 'Discard your changes?',
        message: 'What you have typed in this form has not been saved.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
      }),
      onClose: () => form.destroy(),
    });
  }

  async function remove(row) {
    const confirmed = await confirmDialog({
      title: `Delete this ${noun}?`,
      message: `"${nameOf(row)}" will be removed from the website. This cannot be undone.`,
    });
    if (!confirmed) return;

    showProblem('');
    const result = await api.delete(`${endpoint}/${row.id}`);
    if (!result.ok) {
      showProblem(result.message);
      problem.scrollIntoView({ block: 'nearest' });
      return;
    }
    toast(`${capitalise(noun)} deleted.`);
    load();
    if (onChange) onChange();
  }

  const table = createTable({
    caption,
    columns,
    actions: (row) => [
      { label: 'Edit', name: nameOf(row), onClick: openForm },
      { label: 'Delete', name: nameOf(row), danger: true, onClick: remove },
    ],
    empty: {
      get text() { return emptyText(state); },
      action: { label: `Add ${noun}`, onClick: () => openForm(null) },
    },
  });

  const pager = createPagination({
    label: `${caption} pages`,
    onChange: (page) => {
      state.page = page;
      load();
    },
  });
  table.footer.append(pager.element);

  let latest = 0;
  async function load() {
    latest += 1;
    const mine = latest;
    table.showLoading();
    const params = { page: state.page, limit: PAGE_SIZE, q: state.q };
    filters.forEach((filter) => { params[filter.name] = state[filter.name]; });
    const result = await api.get(`${endpoint}${query(params)}`);
    // A slower, older request must not overwrite a newer one.
    if (mine !== latest) return;

    if (!result.ok) {
      table.showError(result.message, load);
      return;
    }
    const { items, pagination } = result.data;
    // The last row of a page was deleted: step back to the page that still has rows.
    if (items.length === 0 && pagination.total > 0 && state.page > 1) {
      state.page = Math.max(1, pagination.totalPages);
      load();
      return;
    }
    table.showRows(items);
    pager.update(pagination);
  }

  if (search || filters.length > 0) {
    root.append(createFilterBar({
      search: search ? {
        label: search.label,
        onSearch: (text) => {
          state.q = text;
          state.page = 1;
          load();
        },
      } : null,
      filters: filters.map((filter) => ({
        ...filter,
        onChange: (value) => {
          state[filter.name] = value;
          state.page = 1;
          load();
        },
      })),
    }).element);
  }
  root.append(problem, table.element);
  addButton.addEventListener('click', () => openForm(null));
  load();

  return { reload: load };
}
