/**
 * admin/js/pages/ministries.js: list, add, edit and delete ministries. Everything
 * the public Ministries page and the home page show about a ministry is edited
 * here; the leader comes from the Leadership page.
 */
import '../shell.js';
import { el } from '../components/dom.js';
import { createCrudPage } from '../components/crudPage.js';
import { createImageUpload } from '../components/imageUpload.js';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Men's Ministry (PEMEM)" becomes "mens-ministry-pemem". The server makes slugs the same way. */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

createCrudPage({
  root: document.getElementById('page-root'),
  addButton: document.getElementById('page-action'),
  endpoint: '/admin/ministries',
  noun: 'ministry',
  nameOf: (row) => row.name,
  caption: 'Ministries, in the order they appear on the website',
  emptyText: (state) => (state.q ? 'No ministries match your search.' : 'No ministries have been added yet.'),
  search: { label: 'Search ministries' },
  columns: [
    { key: 'name', label: 'Name', rowHeader: true, wrap: true },
    { key: 'slug', label: 'Slug' },
    { key: 'leader_count', label: 'Leaders', numeric: true },
    { key: 'display_order', label: 'Order', numeric: true },
  ],
  fields: (row) => [
    { name: 'name', label: 'Name', required: true, maxLength: 150, value: row ? row.name : '', requiredMessage: 'Enter a name.' },
    {
      name: 'slug',
      label: 'Slug',
      maxLength: 150,
      value: row ? row.slug : '',
      help: 'The short name used in web addresses, such as ministries.html#choir: lowercase letters, numbers and hyphens. It is filled in from the name, and you can change it.',
      validate: (value) => (!value || SLUG_PATTERN.test(value) ? '' : 'Use only lowercase letters, numbers and single hyphens, for example "youth-ministry".'),
    },
    { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000, value: row ? row.description : '' },
    {
      name: 'meeting_time',
      label: 'Meets',
      maxLength: 150,
      value: row ? row.meeting_time : '',
      help: 'The day and time it meets, as it should appear on the Ministries page. Left empty, the page shows "[ADD: day and time]".',
    },
    createImageUpload({ name: 'icon_url', label: 'Icon', value: row ? row.icon_url : '' }),
    {
      name: 'display_order',
      label: 'Display order',
      type: 'number',
      min: 0,
      max: 9999,
      value: row ? row.display_order : 0,
      help: 'Lower numbers appear first on the website. Ministries with the same number are shown by name.',
      validate: (value) => (value === '' || (/^\d{1,4}$/.test(value)) ? '' : 'Enter a whole number from 0 to 9999.'),
    },
  ],
  onFormReady(form, row) {
    const nameField = form.fields.find((field) => field.name === 'name');
    const slugField = form.fields.find((field) => field.name === 'slug');
    const name = nameField.input;
    const slug = slugField.input;

    // A new ministry's slug follows its name until someone types in the slug box.
    // An existing ministry keeps its slug, because pages may already link to it.
    let follows = !row;
    slug.addEventListener('input', () => { follows = false; });
    name.addEventListener('input', () => {
      if (follows) slug.value = slugify(name.value);
    });

    // Changing the slug of a saved ministry breaks old links to it, so say so.
    if (row) {
      const warning = el('p', { class: 'banner banner-info', role: 'status', hidden: true });
      slugField.element.append(warning);
      const update = () => {
        const changed = slug.value.trim() !== row.slug;
        warning.hidden = !changed;
        warning.textContent = changed
          ? `Old links to this ministry, such as ministries.html#${row.slug}, will stop working once you save a new slug.`
          : '';
      };
      slug.addEventListener('input', update);
    }
  },
  toBody: (values) => ({
    ...values,
    display_order: values.display_order === '' ? 0 : Number(values.display_order),
  }),
});
