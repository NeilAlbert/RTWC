/**
 * admin/js/components/dialog.js: dialogs and the confirm dialog.
 *
 * Built on the browser's own <dialog>, opened with showModal(). The browser then
 * keeps focus inside the dialog, makes the rest of the page inert, and puts focus
 * back where it was when the dialog closes. Escape closes it. A click on the
 * scrim does not, so a half-filled form is not lost by a stray click.
 *
 * openDialog({
 *   title,
 *   body,                node shown in the scrolling part
 *   actions,             [{ label, variant: 'primary' | 'secondary' | 'danger', onClick, autofocus }]
 *   wide,                true for a wider dialog
 *   canClose(),          optional. Return false (or a promise of false) to keep it open
 *   onClose(),           called after it has closed
 * })
 * Returns { element, close(), forceClose() }. close() asks canClose first.
 *
 * confirmDialog({ title, message, confirmLabel, danger }) resolves to true or false.
 * Every delete in the admin goes through it.
 */
import { el, uid } from './dom.js';

const VARIANTS = { primary: 'button', secondary: 'button button-secondary', danger: 'button button-danger' };

export function openDialog({ title, body, actions = [], wide = false, canClose, onClose }) {
  const titleId = uid('dialog-title');
  const dialog = el('dialog', { class: wide ? 'dialog dialog-wide' : 'dialog', 'aria-labelledby': titleId });
  let closing = false;

  function forceClose() {
    dialog.close();
  }

  async function close() {
    if (closing) return;
    closing = true;
    const allowed = canClose ? await canClose() : true;
    closing = false;
    if (allowed !== false) forceClose();
  }

  dialog.append(
    el('div', { class: 'dialog-header' },
      el('h2', { class: 'dialog-title', id: titleId, text: title }),
      el('button', { class: 'link-button', type: 'button', text: 'Close', onclick: close })),
    el('div', { class: 'dialog-body' }, body));

  if (actions.length > 0) {
    const footer = el('div', { class: 'dialog-footer' });
    actions.forEach((action) => {
      footer.append(el('button', {
        class: VARIANTS[action.variant] || VARIANTS.secondary,
        type: 'button',
        text: action.label,
        autofocus: Boolean(action.autofocus),
        onclick: () => action.onClick({ close, forceClose }),
      }));
    });
    dialog.append(footer);
  }

  // Escape is handled here rather than left to the browser. Chrome lets a page stop
  // its own Escape-to-close only after a recent click or key press, so a changed
  // form could otherwise close without asking. Taking the key first means canClose
  // is always asked.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (onClose) onClose();
  });

  document.body.append(dialog);
  dialog.showModal();
  return { element: dialog, close, forceClose };
}

export function confirmDialog({ title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', danger = true }) {
  return new Promise((resolve) => {
    let confirmed = false;
    openDialog({
      title,
      body: el('p', { text: message }),
      actions: [
        // Focus starts on Cancel, so pressing Enter by habit does not delete anything.
        { label: cancelLabel, variant: 'secondary', autofocus: true, onClick: ({ forceClose }) => forceClose() },
        {
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          onClick: ({ forceClose }) => {
            confirmed = true;
            forceClose();
          },
        },
      ],
      onClose: () => resolve(confirmed),
    });
  });
}
