/* Admin > Events: list (upcoming, past or all), add, edit and delete events.
   Events saved here appear on the public Events page and the home page at once. */

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('events', 'Events');

  const { formatDate, statusTag, crudPage } = window.AdminUI;
  const whenSelect = document.getElementById('event-when');

  const CATEGORIES = [
    ['convention', 'Convention'],
    ['revival', 'Revival'],
    ['camp_meeting', 'Camp meeting'],
    ['anniversary', 'Anniversary'],
    ['other', 'Other'],
  ];
  const categoryName = Object.fromEntries(CATEGORIES);
  const EMPTY_TEXT = {
    upcoming: 'There are no upcoming events.',
    past: 'There are no past events.',
    all: 'No events have been added yet.',
  };

  const list = crudPage({
    noun: 'event',
    tableLabel: 'Events',
    tableHost: document.getElementById('event-table'),
    paginationHost: document.getElementById('event-pagination'),
    alertHost: document.getElementById('page-alert'),
    addButton: document.getElementById('add-event'),
    nameOf: (row) => row.title,
    columns: [
      { label: 'Title', render: (row) => row.title },
      { label: 'Date', render: (row) => formatDate(row.event_date) },
      { label: 'Time', render: (row) => row.event_time || 'Not set' },
      { label: 'Type', render: (row) => statusTag(categoryName[row.category] || row.category) },
    ],
    load: async ({ page }) => {
      const params = new URLSearchParams({ when: whenSelect.value, page: String(page), limit: '20' });
      const response = await AdminApi.get(`/admin/events?${params}`);
      return response.data;
    },
    emptyText: () => EMPTY_TEXT[whenSelect.value],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, requiredMessage: 'Enter a title.', maxLength: 255 },
      { name: 'event_date', label: 'Date', type: 'date', required: true, requiredMessage: 'Choose the date.' },
      { name: 'event_time', label: 'Time', type: 'text', maxLength: 50, hint: 'For example "6:30 pm to 9:00 pm". Leave empty if not yet known.' },
      { name: 'location', label: 'Location', type: 'text', maxLength: 255 },
      { name: 'category', label: 'Type of event', type: 'select', options: CATEGORIES, required: true, requiredMessage: 'Choose a type of event.' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000 },
    ],
    toForm: (row) => ({
      title: row ? row.title : '',
      event_date: row ? String(row.event_date).slice(0, 10) : '',
      event_time: row ? row.event_time : '',
      location: row ? row.location : '',
      category: row ? row.category : 'other',
      description: row ? row.description : '',
    }),
    save: (values, row) => (row ? AdminApi.put(`/events/${row.id}`, values) : AdminApi.post('/events', values)),
    remove: (row) => AdminApi.delete(`/events/${row.id}`),
  });

  whenSelect.addEventListener('change', () => list.reload());
});
