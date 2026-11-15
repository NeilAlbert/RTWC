/* Shared admin component: an inbox page.
   Messages and Prayer Requests work the same way: a table with a status filter,
   a row that opens the whole item in a dialog, a status dropdown there that
   saves as soon as it is changed, and Delete with a confirmation.
   Everything a visitor typed is shown as plain text, never as HTML. */

(() => {
  const { el, toast, openDialog, confirmAction, createTable, createPagination, statusTag, uniqueId } = window.AdminUI;

  /**
   * @param {object} config
   * @param {string} config.noun  singular, lowercase: "message"
   * @param {string} config.tableLabel  "Messages"
   * @param {HTMLElement} config.tableHost
   * @param {HTMLElement} config.paginationHost
   * @param {HTMLElement} config.alertHost
   * @param {HTMLSelectElement} config.statusFilter  '' means every status
   * @param {Array<[string, string, string]>} config.statuses  [value, label, tag kind]
   * @param {Array} config.columns  table columns before Status and Actions
   * @param {Function} config.nameOf  (row) => short name, for button labels
   * @param {string} config.path  API path, for example '/admin/contact'
   * @param {boolean} [config.fetchOnOpen]  load the whole item when it is opened
   * @param {string} [config.markOnOpen]  status given to a new item when it is opened
   * @param {Function} config.detail  (item) => nodes shown in the dialog
   * @param {Function} config.emptyText  (status) => sentence for an empty list
   */
  function inboxPage(config) {
    let page = 1;
    let loadCount = 0;
    const statusLabel = Object.fromEntries(config.statuses.map(([value, label]) => [value, label]));
    const statusKind = Object.fromEntries(config.statuses.map(([value, , kind]) => [value, kind]));

    const table = createTable({
      label: config.tableLabel,
      onRowClick: (row) => openItem(row),
      columns: [
        ...config.columns,
        { label: 'Status', render: (row) => statusTag(statusLabel[row.status] || row.status, statusKind[row.status]) },
        {
          label: 'Actions',
          actions: true,
          render: (row) => [
            el('button', {
              type: 'button',
              class: 'btn-text',
              text: 'Open',
              'aria-label': `Open: ${config.nameOf(row)}`,
              on: { click: () => openItem(row) },
            }),
            el('button', {
              type: 'button',
              class: 'btn-text btn-text-danger',
              text: 'Delete',
              'aria-label': `Delete: ${config.nameOf(row)}`,
              on: { click: () => removeItem(row) },
            }),
          ],
        },
      ],
    });
    config.tableHost.replaceChildren(table.element);

    const pagination = createPagination((next) => { page = next; load(); });
    config.paginationHost.replaceChildren(pagination.element);

    function showAlert(message) {
      config.alertHost.textContent = message || '';
      config.alertHost.classList.toggle('visible', Boolean(message));
    }

    function failure(action, err) {
      return err.status === 0
        ? `The ${config.noun} was not ${action} because the server cannot be reached.`
        : `The ${config.noun} was not ${action}. ${err.message}`;
    }

    async function load() {
      loadCount += 1;
      const thisLoad = loadCount;
      table.showLoading();
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (config.statusFilter.value) params.set('status', config.statusFilter.value);
        const response = await window.AdminApi.get(`${config.path}?${params}`);
        if (thisLoad !== loadCount) return;

        const { items, pagination: meta } = response.data;
        if (items.length === 0 && page > 1) {
          page -= 1;
          load();
          return;
        }
        if (items.length === 0) table.showEmpty(config.emptyText(config.statusFilter.value));
        else table.showRows(items);
        pagination.update(meta);
      } catch (err) {
        if (thisLoad !== loadCount) return;
        pagination.update({ page: 1, limit: 1, total: 0 });
        table.showError(
          err.status === 0
            ? `The ${config.tableLabel.toLowerCase()} could not be loaded because the server cannot be reached.`
            : `The ${config.tableLabel.toLowerCase()} could not be loaded. ${err.message}`,
          load
        );
      }
    }

    /** Deletes after a confirmation. Resolves true when the item is gone. */
    async function removeItem(row) {
      showAlert('');
      const confirmed = await confirmAction({
        title: `Delete ${config.noun}`,
        message: `Delete this ${config.noun}? This cannot be undone.`,
      });
      if (!confirmed) return false;

      try {
        await window.AdminApi.delete(`${config.path}/${row.id}`);
        toast(`The ${config.noun} was deleted.`);
        load();
        window.AdminAuth.refreshCounts();
        return true;
      } catch (err) {
        showAlert(failure('deleted', err));
        toast(`The ${config.noun} was not deleted.`, 'error');
        return false;
      }
    }

    async function openItem(row) {
      showAlert('');
      let item = row;
      let changed = false;

      if (config.fetchOnOpen) {
        try {
          item = (await window.AdminApi.get(`${config.path}/${row.id}`)).data;
        } catch (err) {
          showAlert(failure('opened', err));
          toast(`The ${config.noun} could not be opened.`, 'error');
          return;
        }
      }

      // Opening a new item counts as reading it. If this fails the item simply stays new.
      if (config.markOnOpen && item.status === 'new') {
        try {
          item = { ...item, ...(await window.AdminApi.patch(`${config.path}/${row.id}/status`, { status: config.markOnOpen })).data };
          changed = true;
        } catch (err) {
          showAlert(`The ${config.noun} could not be marked as ${statusLabel[config.markOnOpen].toLowerCase()}. ${err.message}`);
        }
      }

      const selectId = uniqueId('status');
      const noteId = `${selectId}-note`;
      const select = el('select', { id: selectId, 'aria-describedby': noteId },
        config.statuses.map(([value, label]) => new Option(label, value)));
      select.value = item.status;
      const note = el('span', { class: 'hint', id: noteId, role: 'status' });
      const error = el('div', { class: 'alert alert-error', role: 'alert' });
      const deleteButton = el('button', { type: 'button', class: 'btn btn-danger', text: 'Delete' });
      const closeButton = el('button', { type: 'button', class: 'btn btn-outline', text: 'Close' });

      const { close } = openDialog({
        title: config.dialogTitle,
        body: [
          ...config.detail(item),
          el('div', { class: 'form-group dialog-status' }, [
            el('label', { for: selectId, text: 'Status' }),
            select,
            note,
          ]),
          error,
          el('div', { class: 'dialog-actions' }, [closeButton, deleteButton]),
        ],
        onClose: () => {
          if (changed) {
            load();
            window.AdminAuth.refreshCounts();
          }
        },
      });

      // The status saves as soon as it is changed.
      let saved = item.status;
      select.addEventListener('change', async () => {
        const wanted = select.value;
        select.disabled = true;
        note.textContent = 'Saving.';
        error.classList.remove('visible');
        try {
          await window.AdminApi.patch(`${config.path}/${row.id}/status`, { status: wanted });
          saved = wanted;
          changed = true;
          note.textContent = `Saved as ${statusLabel[wanted]}.`;
          toast('The status was changed.');
        } catch (err) {
          select.value = saved;
          note.textContent = '';
          error.textContent = failure('changed', err);
          error.classList.add('visible');
          toast('The status was not changed.', 'error');
        } finally {
          select.disabled = false;
          select.focus();
        }
      });

      closeButton.addEventListener('click', close);
      deleteButton.addEventListener('click', async () => {
        if (await removeItem(row)) {
          changed = false; // removeItem has already reloaded the list
          close();
        }
      });
      closeButton.focus();
    }

    config.statusFilter.addEventListener('change', () => {
      page = 1;
      load();
    });
    load();
  }

  window.AdminUI.inboxPage = inboxPage;
})();
