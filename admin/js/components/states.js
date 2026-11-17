/**
 * admin/js/components/states.js: the three states every list has besides its rows.
 * Each function replaces the contents of `container`.
 */
import { el } from './dom.js';

/** Flat grey rows while a list loads. */
export function showLoading(container, rows = 4) {
  const skeleton = el('div', { class: 'skeleton' });
  for (let i = 0; i < rows; i += 1) skeleton.append(el('div', { class: 'skeleton-row' }));
  container.replaceChildren(el('p', { class: 'visually-hidden', role: 'status', text: 'Loading' }), skeleton);
}

/** One plain sentence, and the main action when there is one: { label, onClick } or { label, href }. */
export function showEmpty(container, sentence, action) {
  const state = el('div', { class: 'state' }, el('p', { class: 'muted', text: sentence }));
  if (action && action.href) {
    state.append(el('a', { class: 'button', href: action.href, text: action.label }));
  } else if (action) {
    state.append(el('button', { class: 'button', type: 'button', text: action.label, onclick: action.onClick }));
  }
  container.replaceChildren(state);
}

/** A bordered banner with the message and "Try again". */
export function showError(container, message, onRetry) {
  const banner = el('div', { class: 'banner banner-error', role: 'alert' }, el('span', { text: message }));
  if (onRetry) {
    banner.append(el('button', { class: 'button button-secondary', type: 'button', text: 'Try again', onclick: onRetry }));
  }
  container.replaceChildren(el('div', { class: 'state' }, banner));
}
