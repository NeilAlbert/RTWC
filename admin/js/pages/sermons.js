/**
 * admin/js/pages/sermons.js: list, search, add, edit and delete sermons.
 */
import '../shell.js';
import { formatDate } from '../components/dom.js';
import { createCrudPage } from '../components/crudPage.js';
import { createImageUpload } from '../components/imageUpload.js';

createCrudPage({
  root: document.getElementById('page-root'),
  addButton: document.getElementById('page-action'),
  endpoint: '/admin/sermons',
  noun: 'sermon',
  nameOf: (row) => row.title,
  caption: 'Sermons, newest first',
  search: { label: 'Search by title or speaker' },
  emptyText: (state) => (state.q ? 'No sermons match that search.' : 'No sermons have been added yet.'),
  columns: [
    { key: 'title', label: 'Title', rowHeader: true, wrap: true },
    { key: 'speaker', label: 'Speaker' },
    { label: 'Date', render: (row) => formatDate(row.sermon_date) },
  ],
  fields: (row) => [
    { name: 'title', label: 'Title', required: true, maxLength: 200, value: row ? row.title : '', requiredMessage: 'Enter a title.' },
    { name: 'speaker', label: 'Speaker', required: true, maxLength: 120, value: row ? row.speaker : '', requiredMessage: 'Enter the speaker.' },
    { name: 'sermon_date', label: 'Date', type: 'date', required: true, value: row ? String(row.sermon_date).slice(0, 10) : '', requiredMessage: 'Choose the date.' },
    {
      name: 'video_url',
      label: 'Video link',
      type: 'url',
      maxLength: 500,
      value: row ? row.video_url : '',
      help: 'The full address of the video, starting with https://.',
      validate: (value) => (!value || /^https?:\/\/\S+$/i.test(value.trim()) ? '' : 'The video link must start with http:// or https://.'),
    },
    createImageUpload({ name: 'thumbnail_url', label: 'Thumbnail', value: row ? row.thumbnail_url : '' }),
    { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000, value: row ? row.description : '' },
  ],
});
