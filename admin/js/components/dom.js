/**
 * admin/js/components/dom.js: small helpers every component uses.
 *
 * Text from the server is always placed with textContent (el() does this), so it
 * can never run as HTML. escapeHTML() is for the rare place that builds a string.
 */

let nextId = 0;

/** A page-unique id, for tying labels, help text and errors to their input. */
export function uid(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

/**
 * Creates an element.
 * props: `class`, `text` (set as textContent), `on<event>` functions, and any
 * attribute. A null, undefined or false value is skipped; true sets an empty attribute.
 * children: nodes or strings. Strings become text nodes.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  });
  children.flat().forEach((child) => {
    if (child !== undefined && child !== null && child !== false) node.append(child);
  });
  return node;
}

export function clear(node) {
  node.replaceChildren();
}

export function escapeHTML(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Runs fn once, `wait` milliseconds after the last call. */
export function debounce(fn, wait = 300) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Reads "2026-08-28" or "2026-08-28 14:05:00" as written, with no time zone shift. */
function parseParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value || ''));
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] === undefined ? null : Number(match[4]),
    minute: match[5] === undefined ? null : Number(match[5]),
  };
}

/** "28 August 2026". An empty or unreadable date gives ''. */
export function formatDate(value) {
  const parts = parseParts(value);
  if (!parts || parts.month < 1 || parts.month > 12) return '';
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** "28 August 2026, 2:05 pm". Falls back to the date alone when there is no time. */
export function formatDateTime(value) {
  const parts = parseParts(value);
  const date = formatDate(value);
  if (!parts || !date || parts.hour === null) return date;
  const hour = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const minute = String(parts.minute).padStart(2, '0');
  return `${date}, ${hour}:${minute} ${parts.hour < 12 ? 'am' : 'pm'}`;
}

/** "1.4 MB", "320 KB". */
export function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
