/* Shared admin component: dialogs.
   Built on the browser's own <dialog>, opened with showModal(). The browser then
   keeps keyboard focus inside the dialog, makes the page behind it inert, and
   closes it on Escape. When it closes, focus goes back to whatever opened it. */

(() => {
  const { el, uniqueId } = window.AdminUI;

  /**
   * Opens a dialog.
   * @param {object} options
   * @param {string} options.title
   * @param {Node|Node[]} options.body
   * @param {boolean} [options.small]  narrow dialog, for confirmations
   * @param {Function} [options.onClose]  called once, after it has closed
   * @returns {{ dialog: HTMLDialogElement, close: Function }}
   */
  function openDialog({ title, body, small = false, onClose }) {
    const trigger = document.activeElement;
    const titleId = uniqueId('dialog-title');

    const dialog = el('dialog', { class: small ? 'dialog dialog-small' : 'dialog', 'aria-labelledby': titleId }, [
      el('div', { class: 'dialog-head' }, [
        el('h2', { class: 'dialog-title', id: titleId, text: title }),
        el('button', { type: 'button', class: 'btn-text', text: 'Close', on: { click: () => dialog.close() } }),
      ]),
      el('div', { class: 'dialog-body' }, body),
    ]);

    dialog.addEventListener('close', () => {
      dialog.remove();
      if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') trigger.focus();
      if (onClose) onClose();
    });

    document.body.append(dialog);
    dialog.showModal();
    return { dialog, close: () => dialog.close() };
  }

  /**
   * Asks a yes or no question before something that cannot be undone.
   * Resolves true only when the confirm button is pressed.
   * @returns {Promise<boolean>}
   */
  function confirmAction({ title, message, confirmLabel = 'Delete', danger = true }) {
    return new Promise((resolve) => {
      let confirmed = false;
      const cancel = el('button', { type: 'button', class: 'btn btn-outline', text: 'Cancel' });
      const confirm = el('button', { type: 'button', class: danger ? 'btn btn-danger' : 'btn btn-primary', text: confirmLabel });

      const { close } = openDialog({
        title,
        small: true,
        body: [
          el('p', { class: 'dialog-message', text: message }),
          el('div', { class: 'dialog-actions' }, [confirm, cancel]),
        ],
        onClose: () => resolve(confirmed),
      });

      cancel.addEventListener('click', close);
      confirm.addEventListener('click', () => {
        confirmed = true;
        close();
      });
      // Start on Cancel, so pressing Enter by habit does not delete anything.
      cancel.focus();
    });
  }

  Object.assign(window.AdminUI, { openDialog, confirmAction });
})();
