/**
 * admin/js/components/inboxPage.js: a list of things people sent through the
 * website, each opened in a dialog. Messages and Prayer Requests are each one
 * call to this.
 *
 * createInboxPage({
 *   root,              element the filter bar, messages and table are put in
 *   endpoint,          for example '/admin/contact'
 *   noun,              'message'. Used in "Delete this message?" and so on
 *   nameOf(row),       what to call a row in the table and in messages
 *   caption,           what the table lists, for screen readers
 *   statuses,          [{ value, label, tone }] in order. tone is a tag tone (tag.js)
 *   columns,           the columns before Date and Status. See table.js
 *   searchLabel,       the label of the search box
 *   emptyText(state),  the sentence shown when the list is empty
 *   details(item),     [{ label, value }] shown above the text in the dialog. value is a node or a string
 *   textOf(item),      the full text shown in the dialog
 *   titleOf(item),     the dialog title
 *   markReadOnOpen,    true to change a new item to "read" when it is opened
 * })
 *
 * The dialog has a status dropdown that saves as soon as it changes, and Delete.
 * Opening /admin/messages.html?id=12 opens that item straight away.
 */
import { el, uid, formatDateTime } from './dom.js';
import { api, query } from '../adminApi.js';
import { createTable } from './table.js';
import { createPagination } from './pagination.js';
import { createFilterBar } from './filterBar.js';
import { openDialog, confirmDialog } from './dialog.js';
import { tag } from './tag.js';
import { toast } from './toast.js';
import { refreshCounts } from '../shell.js';

const PAGE_SIZE = 20;

export function createInboxPage(config) {
  const {
    root, endpoint, noun, nameOf, caption, statuses, columns, searchLabel, emptyText, details, textOf, titleOf, markReadOnOpen = false,
  } = config;

  const state = { page: 1, q: '', status: '' };
  const statusInfo = (value) => statuses.find((status) => status.value === value) || { label: value, tone: 'neutral' };

  const problem = el('div', { class: 'banner banner-error page-problem', role: 'alert', hidden: true });
  function showProblem(message) {
    problem.textContent = message;
    problem.hidden = !message;
    if (message) problem.scrollIntoView({ block: 'nearest' });
  }

  /** Anything that changes a status or removes an item changes the unread counts too. */
  function changed() {
    load();
    refreshCounts();
  }

  async function remove(item, detailDialog) {
    const confirmed = await confirmDialog({
      title: `Delete this ${noun}?`,
      message: `The ${noun} from ${nameOf(item)} will be deleted. This cannot be undone.`,
    });
    if (!confirmed) return false;

    showProblem('');
    const result = await api.delete(`${endpoint}/${item.id}`);
    if (!result.ok) {
      // Shown in the dialog when it is open, otherwise above the table.
      if (detailDialog) detailDialog.showError(result.message);
      else showProblem(result.message);
      if (result.status === 404) changed();
      return false;
    }
    if (detailDialog) detailDialog.forceClose();
    toast(`${noun.charAt(0).toUpperCase()}${noun.slice(1)} deleted.`);
    changed();
    return true;
  }

  function statusControl(item, dialogApi) {
    const id = uid('status');
    const select = el('select', { class: 'input', id });
    statuses.forEach((status) => select.append(el('option', { value: status.value, text: status.label, selected: status.value === item.status })));
    const note = el('p', { class: 'field-help', role: 'status' });
    let saved = item.status;

    select.addEventListener('change', async () => {
      const wanted = select.value;
      select.disabled = true;
      note.textContent = 'Saving';
      dialogApi.showError('');
      const result = await api.patch(`${endpoint}/${item.id}/status`, { status: wanted });
      select.disabled = false;
      if (!result.ok) {
        select.value = saved;
        note.textContent = '';
        dialogApi.showError(result.message);
        select.focus();
        return;
      }
      saved = wanted;
      note.textContent = `Status saved: ${statusInfo(wanted).label}.`;
      changed();
    });

    return {
      element: el('div', { class: 'field' }, el('label', { class: 'field-label', for: id, text: 'Status' }), select, note),
      set(value) {
        saved = value;
        select.value = value;
      },
      note,
    };
  }

  /** Opens one item. The list row may be partial, so the whole item is fetched first. */
  async function open(row) {
    showProblem('');
    const result = await api.get(`${endpoint}/${row.id}`);
    if (!result.ok) {
      showProblem(result.message);
      if (result.status === 404) changed();
      return;
    }
    let item = result.data;

    const error = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });
    const dialogApi = {
      showError(message) {
        error.textContent = message;
        error.hidden = !message;
      },
      forceClose: () => {},
    };
    const status = statusControl(item, dialogApi);

    const list = el('dl', { class: 'detail-list' });
    details(item).forEach(({ label, value }) => list.append(el('div', {}, el('dt', { text: label }), el('dd', {}, value))));

    const body = el('div', { class: 'inbox-detail' },
      error,
      list,
      status.element,
      el('div', { class: 'inbox-text-block' },
        el('h3', { class: 'inbox-text-heading', text: noun.charAt(0).toUpperCase() + noun.slice(1) }),
        el('p', { class: 'inbox-text', text: textOf(item) })));

    const dialog = openDialog({
      title: titleOf(item),
      body,
      wide: true,
      actions: [
        { label: 'Close', variant: 'secondary', autofocus: true, onClick: ({ close }) => close() },
        { label: 'Delete', variant: 'danger', onClick: () => remove(item, dialogApi) },
      ],
    });
    dialogApi.forceClose = dialog.forceClose;

    if (markReadOnOpen && item.status === 'new') {
      const marked = await api.patch(`${endpoint}/${item.id}/status`, { status: 'read' });
      if (marked.ok) {
        item = { ...item, status: 'read' };
        status.set('read');
        status.note.textContent = 'Marked as read.';
        changed();
      } else {
        dialogApi.showError(marked.message);
      }
    }
  }

  const table = createTable({
    caption,
    columns: [
      ...columns,
      { label: 'Received', render: (row) => el('span', { class: 'cell-date', text: formatDateTime(row.created_at) }) },
      { label: 'Status', render: (row) => tag(statusInfo(row.status).label, statusInfo(row.status).tone) },
    ],
    onRowClick: open,
    // The name opens the item, so the actions column holds only Delete.
    actions: (row) => [
      { label: 'Delete', name: nameOf(row), danger: true, onClick: (item) => remove(item, null) },
    ],
    empty: { get text() { return emptyText(state); } },
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
    const result = await api.get(`${endpoint}${query({ page: state.page, limit: PAGE_SIZE, q: state.q, status: state.status })}`);
    if (mine !== latest) return;
    if (!result.ok) {
      table.showError(result.message, load);
      return;
    }
    const { items, pagination } = result.data;
    if (items.length === 0 && pagination.total > 0 && state.page > 1) {
      state.page = Math.max(1, pagination.totalPages);
      load();
      return;
    }
    table.showRows(items);
    pager.update(pagination);
  }

  root.append(
    createFilterBar({
      search: {
        label: searchLabel,
        onSearch: (text) => {
          state.q = text;
          state.page = 1;
          load();
        },
      },
      filters: [{
        label: 'Status',
        value: '',
        options: [{ value: '', label: 'All' }, ...statuses.map((status) => ({ value: status.value, label: status.label }))],
        onChange: (value) => {
          state.status = value;
          state.page = 1;
          load();
        },
      }],
    }).element,
    problem,
    table.element
  );
  load();

  // A link such as the dashboard's opens one item: ?id=12
  const linked = new URLSearchParams(window.location.search).get('id');
  if (linked && /^[1-9][0-9]{0,9}$/.test(linked)) open({ id: linked });
}

/** The sender's address as a mailto: link, for the dialog. */
export function emailLink(address) {
  const text = String(address || '');
  // Only a plain address becomes a link, so the href can never be anything but mailto:.
  if (!/^[^\s@<>"]+@[^\s@<>"]+$/.test(text)) return text;
  return el('a', { href: `mailto:${text}`, text });
}
