/**
 * admin/js/components/toast.js: a short message that goes away after 5 seconds.
 *
 * For confirmations such as "Sermon saved". An error must also be shown where it
 * happened (a field error or a banner): a toast is never the only place it appears.
 */
import { el } from './dom.js';

const SHOW_FOR_MS = 5000;
let region = null;

export function toast(message) {
  if (!region) {
    region = el('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  const item = el('p', { class: 'toast', text: message });
  region.append(item);
  window.setTimeout(() => item.remove(), SHOW_FOR_MS);
}
