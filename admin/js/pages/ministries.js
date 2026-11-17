/**
 * admin/js/pages/ministries.js: list, add, edit and delete ministries.
 */
import '../shell.js';
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
  caption: 'Ministries, by name',
  emptyText: () => 'No ministries have been added yet.',
  columns: [
    { key: 'name', label: 'Name', rowHeader: true, wrap: true },
    { key: 'slug', label: 'Slug' },
    { key: 'leader_count', label: 'Leaders', numeric: true },
  ],
  fields: (row) => [
    { name: 'name', label: 'Name', required: true, maxLength: 150, value: row ? row.name : '', requiredMessage: 'Enter a name.' },
    {
      name: 'slug',
      label: 'Slug',
      maxLength: 150,
      value: row ? row.slug : '',
      help: 'The short name used in web addresses: lowercase letters, numbers and hyphens. It is filled in from the name, and you can change it.',
      validate: (value) => (!value || SLUG_PATTERN.test(value) ? '' : 'Use only lowercase letters, numbers and single hyphens, for example "youth-ministry".'),
    },
    createImageUpload({ name: 'icon_url', label: 'Icon', value: row ? row.icon_url : '' }),
    { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000, value: row ? row.description : '' },
  ],
  onFormReady(form, row) {
    const name = form.fields.find((field) => field.name === 'name').input;
    const slug = form.fields.find((field) => field.name === 'slug').input;
    // The slug follows the name until someone types in the slug box. An existing
    // ministry keeps its slug, because other pages may already link to it.
    let follows = !row;
    slug.addEventListener('input', () => { follows = false; });
    name.addEventListener('input', () => {
      if (follows) slug.value = slugify(name.value);
    });
  },
});
