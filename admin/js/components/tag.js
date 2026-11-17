/**
 * admin/js/components/tag.js: the small rectangular status tag.
 * The status is always written as text. Colour only supports it.
 */
import { el } from './dom.js';

const TONES = ['neutral', 'info', 'success', 'warning', 'danger'];

/** tone: 'neutral' (default), 'info', 'success', 'warning' or 'danger'. */
export function tag(text, tone = 'neutral') {
  const known = TONES.includes(tone) && tone !== 'neutral';
  return el('span', { class: known ? `tag tag-${tone}` : 'tag', text });
}
