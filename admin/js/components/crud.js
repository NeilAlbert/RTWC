/* Shared admin component: a list page with add, edit and delete.
   Sermons, Events, Ministries and Leadership all work the same way: a table,
   an "Add" button that opens a form in a dialog, "Edit" and "Delete" on each
   row, a confirmation before deleting, and a toast after each action. Each page
   supplies only what differs: its columns, its fields, and its API calls. */

(() => {
  const { el, toast, openDialog, confirmAction, createTable, createPagination, createForm } = window.AdminUI;

  /**
   * @param {object} config
   * @param {string} config.noun  singular, lowercase: "sermon"
   * @param {string} config.tableLabel  "Sermons"
   * @param {HTMLElement} config.tableHost  where the table goes
   * @param {HTMLElement} [config.paginationHost]  where the pagination goes, for paginated lists
   * @param {HTMLElement} config.alertHost  where a failed delete is explained
   * @param {HTMLButtonElement} config.addButton
   * @param {Array} config.columns  table columns, without the actions column
   * @param {Function} config.load  async ({ page }) => ({ items, pagination })  pagination may be null
   * @param {Function} config.emptyText  () => sentence for an empty list
   * @param {Array} config.fields  form kit fields
   * @param {Function} config.toForm  (row) => form values
   * @param {Function} config.save  async (values, row or null) => void
   * @param {Function} config.remove  async (row) => void
   * @param {Function} config.nameOf  (row) => the item's name, for button labels
   * @param {Function} [config.onFormOpen]  (form, row or null) => void, to wire up field behaviour
   */
  function crudPage(config) {
    let page = 1;
    let loadCount = 0;

    const columns = [
      ...config.columns,
      {
        label: 'Actions',
        actions: true,
        render: (row) => [
          el('button', {
            type: 'button',
            class: 'btn-text',
            text: 'Edit',
            'aria-label': `Edit: ${config.nameOf(row)}`,
            on: { click: () => openForm(row) },
          }),
          el('button', {
            type: 'button',
            class: 'btn-text btn-text-danger',
            text: 'Delete',
            'aria-label': `Delete: ${config.nameOf(row)}`,
            on: { click: () => removeRow(row) },
          }),
        ],
      },
    ];

    const table = createTable({ label: config.tableLabel, columns });
    config.tableHost.replaceChildren(table.element);

    const pagination = config.paginationHost ? createPagination((next) => { page = next; load(); }) : null;
    if (pagination) config.paginationHost.replaceChildren(pagination.element);

    function showAlert(message) {
      config.alertHost.textContent = message || '';
      config.alertHost.classList.toggle('visible', Boolean(message));
    }

    async function load() {
      loadCount += 1;
      const thisLoad = loadCount;
      table.showLoading();
      try {
        const { items, pagination: meta } = await config.load({ page });
        if (thisLoad !== loadCount) return; // a newer load has started

        // Deleting the last row of a page leaves that page empty: step back one.
        if (items.length === 0 && page > 1) {
          page -= 1;
          load();
          return;
        }

        if (items.length === 0) {
          table.showEmpty(config.emptyText(), el('button', {
            type: 'button',
            class: 'btn btn-primary',
            text: config.addButton.textContent,
            on: { click: () => openForm(null) },
          }));
        } else {
          table.showRows(items);
        }
        if (pagination) pagination.update(meta || { page: 1, limit: items.length || 1, total: items.length });
      } catch (err) {
        if (thisLoad !== loadCount) return;
        if (pagination) pagination.update({ page: 1, limit: 1, total: 0 });
        table.showError(
          err.status === 0
            ? `The ${config.tableLabel.toLowerCase()} could not be loaded because the server cannot be reached.`
            : `The ${config.tableLabel.toLowerCase()} could not be loaded. ${err.message}`,
          load
        );
      }
    }

    function openForm(row) {
      showAlert('');
      let dialog = null;
      const form = createForm({
        fields: config.fields,
        submitLabel: 'Save',
        onCancel: () => dialog.close(),
        onSubmit: async (values) => {
          await config.save(values, row);
          dialog.close();
          toast(row ? `The ${config.noun} was saved.` : `The ${config.noun} was added.`);
          load();
        },
      });
      form.setValues(row ? config.toForm(row) : config.toForm(null));
      dialog = openDialog({
        title: row ? `Edit ${config.noun}` : `Add ${config.noun}`,
        body: form.element,
      });
      if (config.onFormOpen) config.onFormOpen(form, row);
      form.focusFirst();
    }

    async function removeRow(row) {
      showAlert('');
      const confirmed = await confirmAction({
        title: `Delete ${config.noun}`,
        message: `Delete this ${config.noun}? This cannot be undone.`,
      });
      if (!confirmed) return;

      try {
        await config.remove(row);
        toast(`The ${config.noun} was deleted.`);
        load();
      } catch (err) {
        const message = err.status === 0
          ? `The ${config.noun} was not deleted because the server cannot be reached.`
          : `The ${config.noun} was not deleted. ${err.message}`;
        showAlert(message);
        toast(`The ${config.noun} was not deleted.`, 'error');
      }
    }

    config.addButton.addEventListener('click', () => openForm(null));
    load();

    return {
      /** Loads the list again from page 1, after a filter or search changes. */
      reload() {
        page = 1;
        load();
      },
    };
  }

  window.AdminUI.crudPage = crudPage;
})();
