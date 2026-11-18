/**
 * admin/js/pages/settings.js: the church details, service times, page text,
 * live stream links and site announcement shown on the public site.
 *
 * Loads with GET /api/admin/settings and saves with PUT /api/settings, sending
 * only the fields that changed. The public pages read the new values on their
 * next load.
 */
import '../shell.js';
import { el } from '../components/dom.js';
import { api } from '../adminApi.js';
import { createField } from '../components/form.js';
import { showLoading, showError } from '../components/states.js';
import { toast } from '../components/toast.js';

const root = document.getElementById('page-root');

const PHONE = /^[0-9+()\-.\s]*$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const HTTP = /^https?:\/\/[^\s<>"'`]+$/i;
const SITE_PATH = /^\/(?!\/)[^\s<>"'`]*$/;

const checkPhone = (value) => (value && !PHONE.test(value) ? 'Use only numbers, spaces and + ( ) - in the number.' : '');
const checkHttp = (value) => (value && !HTTP.test(value) ? 'The link must start with http:// or https://.' : '');

/** The panels in page order. Each field's key is a site_settings key. */
const PANELS = [
  {
    heading: 'Church details',
    intro: 'Shown in the footer of every page and on the Contact page.',
    fields: [
      { key: 'church_address', label: 'Address', type: 'textarea', rows: 3, help: 'Each line here is shown on its own line.' },
      { key: 'phone_number', label: 'Phone number', type: 'text', autocomplete: 'off', validate: checkPhone },
      { key: 'helpline_number', label: 'Helpline number', type: 'text', help: 'Shown on the Contact page.', validate: checkPhone },
      {
        key: 'email',
        label: 'Contact email',
        type: 'email',
        validate: (value) => (value && !EMAIL.test(value) ? 'Enter an email address such as office@example.org.' : ''),
      },
    ],
  },
  {
    heading: 'Service times',
    fields: [
      {
        key: 'service_times',
        label: 'Service times',
        type: 'textarea',
        rows: 5,
        help: 'One service per line, for example "Sunday worship service: 8:00 am to 11:30 am". Shown on the home page, the Contact page and in the footer.',
      },
    ],
  },
  {
    heading: 'Welcome text',
    fields: [
      { key: 'welcome_message', label: 'Welcome message', type: 'textarea', rows: 5, help: 'The first paragraph of the home page.' },
    ],
  },
  {
    heading: 'About',
    intro: 'Shown on the About page.',
    fields: [
      { key: 'mission_statement', label: 'Mission statement', type: 'textarea', rows: 4 },
      { key: 'vision_statement', label: 'Vision statement', type: 'textarea', rows: 4 },
    ],
  },
  {
    heading: 'Featured verse',
    intro: 'A Bible verse in a navy band on the home page. The band is shown only when both fields are filled in.',
    fields: [
      { key: 'featured_verse_text', label: 'Verse text', type: 'textarea', rows: 3, help: 'The words of the verse, without quotation marks.' },
      { key: 'featured_verse_ref', label: 'Reference', type: 'text', help: 'The book, chapter and verse, as you would like it printed under the verse.' },
    ],
  },
  {
    heading: 'Live stream',
    intro: 'Used by the Live page.',
    fields: [
      { key: 'youtube_channel_url', label: 'YouTube channel link', type: 'url', validate: checkHttp },
      {
        key: 'youtube_live_video_id',
        label: 'YouTube live video ID',
        type: 'text',
        help: 'The 11 characters after "v=" in the video link.',
        validate: (value) => (value && !/^[A-Za-z0-9_-]{11}$/.test(value) ? 'A YouTube video ID is exactly 11 letters, numbers, - or _.' : ''),
      },
      { key: 'facebook_live_url', label: 'Facebook page or live link', type: 'url', validate: checkHttp },
      {
        key: 'preferred_default_platform',
        label: 'Show first when live on both',
        type: 'select',
        required: true,
        options: [{ value: 'youtube', label: 'YouTube' }, { value: 'facebook', label: 'Facebook' }],
      },
      {
        key: 'live_status_override',
        label: 'Live status',
        type: 'select',
        required: true,
        options: [
          { value: '', label: 'Check automatically' },
          { value: 'live', label: 'Always show as live' },
          { value: 'offline', label: 'Always show as not live' },
        ],
      },
      { key: 'next_service_title', label: 'Next broadcast: name', type: 'text' },
      { key: 'next_service_date', label: 'Next broadcast: date', type: 'date' },
      { key: 'next_service_time', label: 'Next broadcast: time', type: 'text', help: 'For example "8:00 am".' },
      { key: 'previous_broadcast_url', label: 'Link to a recent service', type: 'url', validate: checkHttp },
    ],
  },
  {
    heading: 'Site announcement',
    intro: 'A short notice in a navy bar above the header on every page. Visitors can dismiss it for the rest of their visit.',
    announcement: true,
    fields: [
      { key: 'announcement_enabled', label: 'Show the announcement on the website', type: 'checkbox' },
      {
        key: 'announcement_text',
        label: 'Announcement text',
        type: 'textarea',
        rows: 2,
        // Needed only while the announcement is on, so "(optional)" would mislead.
        hideOptional: true,
        help: 'One or two short sentences. Needed while the announcement is switched on.',
        validate: (value, values) => (values.announcement_enabled && !value.trim() ? 'Enter the announcement text, or switch the announcement off.' : ''),
      },
      {
        key: 'announcement_link',
        label: 'Link',
        type: 'text',
        help: 'Adds a "Find out more" link after the text. Start with https://, or with / for a page on this site, such as /events.html.',
        validate: (value) => (value && !HTTP.test(value) && !SITE_PATH.test(value)
          ? 'The link must start with https://, http://, or / for a page on this site.' : ''),
      },
    ],
  },
];

/** The checkbox is stored as "1" or "0". Everything else is stored as typed. */
function toStored(key, value) {
  if (key === 'announcement_enabled') return value ? '1' : '0';
  return value;
}

function fromStored(key, value) {
  if (key === 'announcement_enabled') return value === '1';
  return value || '';
}

function buildPreview(fields) {
  const box = el('div', { class: 'announcement-preview' });
  const caption = el('p', { class: 'field-label', text: 'Preview' });
  const wrapper = el('div', { class: 'field' }, caption, box);

  function update() {
    const on = fields.announcement_enabled.getValue();
    const text = fields.announcement_text.getValue().trim();
    const link = fields.announcement_link.getValue().trim();
    box.classList.toggle('is-off', !on || !text);
    if (!on) {
      box.replaceChildren(el('p', { text: 'The announcement is off. Nothing is shown on the website.' }));
      return;
    }
    if (!text) {
      box.replaceChildren(el('p', { text: 'Enter the announcement text to see how it will look.' }));
      return;
    }
    const message = el('p', { class: 'announcement-preview-text', text });
    // Not a real link: the preview shows how it will look, it is not for clicking.
    if (link) message.append(' ', el('span', { class: 'announcement-preview-link', text: 'Find out more' }));
    box.replaceChildren(message, el('span', { class: 'announcement-preview-dismiss', 'aria-hidden': 'true', text: 'Dismiss' }));
  }

  ['announcement_enabled', 'announcement_text', 'announcement_link'].forEach((key) => {
    fields[key].input.addEventListener('input', update);
    fields[key].input.addEventListener('change', update);
  });
  return { element: wrapper, update };
}

function render({ values, limits }) {
  const fields = {};
  const original = {};
  const panels = [];

  PANELS.forEach((panel) => {
    const body = el('div', { class: 'panel-body form' });
    if (panel.intro) body.append(el('p', { class: 'panel-intro', text: panel.intro }));
    panel.fields.forEach((config) => {
      if (!Object.prototype.hasOwnProperty.call(values, config.key)) return;
      const field = createField({
        ...config,
        name: config.key,
        maxLength: config.type === 'checkbox' || config.type === 'select' ? undefined : limits[config.key],
        hideOptional: Boolean(config.hideOptional) || config.type === 'checkbox',
      });
      field.setValue(fromStored(config.key, values[config.key]));
      fields[config.key] = field;
      original[config.key] = toStored(config.key, field.getValue());
      body.append(field.element);
    });
    if (panel.announcement && fields.announcement_enabled && fields.announcement_text && fields.announcement_link) {
      const preview = buildPreview(fields);
      body.append(preview.element);
      preview.update();
    }
    const headingId = `panel-${panels.length}`;
    panels.push(el('section', { class: 'panel', 'aria-labelledby': headingId },
      el('div', { class: 'panel-header' }, el('h2', { id: headingId, text: panel.heading })),
      body));
  });

  const banner = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });
  const saveButton = el('button', { class: 'button', type: 'submit', text: 'Save changes' });
  const summary = el('p', { class: 'save-bar-summary', role: 'status' });
  const bar = el('div', { class: 'save-bar' }, saveButton, summary);
  const form = el('form', { class: 'settings-form', novalidate: true }, banner, panels, bar);

  function changes() {
    const changed = {};
    Object.entries(fields).forEach(([key, field]) => {
      const value = toStored(key, field.getValue());
      if (value !== original[key]) changed[key] = value;
    });
    return changed;
  }

  function updateSummary() {
    const count = Object.keys(changes()).length;
    summary.textContent = count === 0 ? 'No unsaved changes.' : `${count} unsaved ${count === 1 ? 'change' : 'changes'}.`;
  }
  form.addEventListener('input', updateSummary);
  form.addEventListener('change', updateSummary);
  updateSummary();

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = !message;
  }

  let saving = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    Object.values(fields).forEach((field) => field.clearError());
    showBanner('');

    const changed = changes();
    if (Object.keys(changed).length === 0) {
      summary.textContent = 'There are no changes to save.';
      return;
    }

    const current = {};
    Object.entries(fields).forEach(([key, field]) => { current[key] = field.getValue(); });
    let first = null;
    Object.entries(fields).forEach(([key, field]) => {
      const message = field.validate ? field.validate(current[key], current) : '';
      if (message) {
        field.setError(message);
        first = first || field;
      }
    });
    if (first) {
      showBanner('Some fields need attention. Nothing was saved.');
      first.focus();
      return;
    }

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving';
    const result = await api.put('/settings', changed);
    saving = false;
    saveButton.disabled = false;
    saveButton.textContent = 'Save changes';

    if (!result.ok) {
      showBanner(result.message);
      result.errors.forEach((item) => {
        const field = fields[item.field];
        if (field) {
          field.setError(item.message);
          first = first || field;
        }
      });
      if (first) first.focus();
      else banner.scrollIntoView({ block: 'nearest' });
      return;
    }

    Object.entries(result.data.values).forEach(([key, value]) => {
      if (!fields[key]) return;
      fields[key].setValue(fromStored(key, value));
      original[key] = toStored(key, fields[key].getValue());
    });
    updateSummary();
    const count = Object.keys(changed).length;
    toast(`Settings saved. ${count} ${count === 1 ? 'change is' : 'changes are'} now on the website.`);
  });

  // The browser asks before leaving with unsaved changes. Its wording cannot be set.
  window.addEventListener('beforeunload', (event) => {
    if (Object.keys(changes()).length === 0) return;
    event.preventDefault();
    event.returnValue = '';
  });

  root.replaceChildren(form);
}

async function load() {
  showLoading(root, 8);
  const result = await api.get('/admin/settings');
  if (!result.ok) {
    showError(root, result.message, load);
    return;
  }
  render(result.data);
}

load();
