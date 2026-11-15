/* Shared admin component: toast messages.
   Short confirmations that an action worked or failed. They close themselves
   after 5 seconds, so an error a person must act on is always shown in the page
   as well (in the form or the table), never only here. */

(() => {
  const { el } = window.AdminUI;
  const SHOW_MS = 5000;
  let region = null;

  function getRegion() {
    if (!region) {
      region = el('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
      document.body.append(region);
    }
    return region;
  }

  /** @param {string} message  @param {'success'|'error'} [type] */
  function toast(message, type = 'success') {
    let timer = null;
    const item = el('div', { class: `toast toast-${type}` }, [
      el('span', { class: 'toast-text', text: message }),
      el('button', {
        type: 'button',
        class: 'btn-text',
        text: 'Dismiss',
        on: { click: () => close() },
      }),
    ]);

    function close() {
      clearTimeout(timer);
      item.remove();
    }

    getRegion().append(item);
    timer = setTimeout(close, SHOW_MS);
    return close;
  }

  window.AdminUI.toast = toast;
})();
