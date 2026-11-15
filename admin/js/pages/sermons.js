/* Admin > Sermons: list, search by title, add, edit and delete sermons. */

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('sermons', 'Sermons');

  const { formatDate, crudPage } = window.AdminUI;
  const searchForm = document.getElementById('sermon-search-form');
  const searchInput = document.getElementById('sermon-search');
  const clearButton = document.getElementById('sermon-search-clear');
  let query = '';

  function isWebLink(value) {
    return /^https?:\/\/\S+$/i.test(value);
  }

  const list = crudPage({
    noun: 'sermon',
    tableLabel: 'Sermons',
    tableHost: document.getElementById('sermon-table'),
    paginationHost: document.getElementById('sermon-pagination'),
    alertHost: document.getElementById('page-alert'),
    addButton: document.getElementById('add-sermon'),
    nameOf: (row) => row.title,
    columns: [
      { label: 'Title', render: (row) => row.title },
      { label: 'Speaker', render: (row) => row.speaker },
      { label: 'Date', render: (row) => formatDate(row.sermon_date) },
    ],
    load: async ({ page }) => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (query) params.set('q', query);
      const response = await AdminApi.get(`/admin/sermons?${params}`);
      return response.data;
    },
    emptyText: () => (query ? `No sermons have "${query}" in the title.` : 'No sermons have been added yet.'),
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, requiredMessage: 'Enter a title.', maxLength: 200 },
      { name: 'speaker', label: 'Speaker', type: 'text', required: true, requiredMessage: 'Enter the speaker.', maxLength: 120 },
      { name: 'sermon_date', label: 'Date preached', type: 'date', required: true, requiredMessage: 'Choose the date.' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000, hint: 'One or two sentences about the message.' },
      {
        name: 'video_url',
        label: 'Video link',
        type: 'url',
        maxLength: 500,
        hint: 'Where the sermon can be watched, for example its Facebook or YouTube link.',
        validate: (value) => (value && !isWebLink(value) ? 'The link must start with http:// or https://.' : ''),
      },
      { name: 'thumbnail_url', label: 'Thumbnail image', type: 'image', hint: 'JPEG, PNG or WebP, 5 MB at most.' },
    ],
    toForm: (row) => ({
      title: row ? row.title : '',
      speaker: row ? row.speaker : '',
      sermon_date: row ? String(row.sermon_date).slice(0, 10) : '',
      description: row ? row.description : '',
      video_url: row ? row.video_url : '',
      thumbnail_url: row ? row.thumbnail_url : '',
    }),
    save: (values, row) => (row ? AdminApi.put(`/sermons/${row.id}`, values) : AdminApi.post('/sermons', values)),
    remove: (row) => AdminApi.delete(`/sermons/${row.id}`),
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    query = searchInput.value.trim();
    clearButton.hidden = !query;
    list.reload();
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    query = '';
    clearButton.hidden = true;
    list.reload();
    searchInput.focus();
  });
});
