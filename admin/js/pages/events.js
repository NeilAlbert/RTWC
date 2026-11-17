/**
 * admin/js/pages/events.js: list (upcoming, past or all), add, edit and delete events.
 * An event saved here shows on the public Events page and the home page at once.
 */
import '../shell.js';
import { formatDate } from '../components/dom.js';
import { tag } from '../components/tag.js';
import { createCrudPage } from '../components/crudPage.js';

const CATEGORIES = [
  { value: 'convention', label: 'Convention' },
  { value: 'revival', label: 'Revival' },
  { value: 'camp_meeting', label: 'Camp meeting' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'other', label: 'Other' },
];
const categoryLabel = Object.fromEntries(CATEGORIES.map((category) => [category.value, category.label]));

const EMPTY_TEXT = {
  upcoming: 'There are no upcoming events.',
  past: 'There are no past events.',
  all: 'No events have been added yet.',
};

createCrudPage({
  root: document.getElementById('page-root'),
  addButton: document.getElementById('page-action'),
  endpoint: '/admin/events',
  noun: 'event',
  nameOf: (row) => row.title,
  caption: 'Events',
  filters: [{
    name: 'when',
    label: 'Show',
    value: 'upcoming',
    options: [
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'past', label: 'Past' },
      { value: 'all', label: 'All' },
    ],
  }],
  emptyText: (state) => EMPTY_TEXT[state.when],
  columns: [
    { key: 'title', label: 'Title', rowHeader: true, wrap: true },
    { label: 'Date', render: (row) => formatDate(row.event_date) },
    { label: 'Time', render: (row) => row.event_time || 'Not set' },
    { label: 'Type', render: (row) => tag(categoryLabel[row.category] || row.category) },
  ],
  fields: (row) => [
    { name: 'title', label: 'Title', required: true, maxLength: 255, value: row ? row.title : '', requiredMessage: 'Enter a title.' },
    { name: 'event_date', label: 'Date', type: 'date', required: true, value: row ? String(row.event_date).slice(0, 10) : '', requiredMessage: 'Choose the date.' },
    { name: 'event_time', label: 'Time', maxLength: 50, value: row ? row.event_time : '', help: 'For example "6:30 pm to 9:00 pm". Leave empty if it is not yet known.' },
    { name: 'location', label: 'Location', maxLength: 255, value: row ? row.location : '' },
    { name: 'category', label: 'Type of event', type: 'select', required: true, options: CATEGORIES, value: row ? row.category : 'other' },
    { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000, value: row ? row.description : '' },
  ],
});
