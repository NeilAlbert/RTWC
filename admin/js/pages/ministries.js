/* Admin > Ministries: list, add, edit and delete ministries.
   A ministry that still has leaders cannot be deleted; the server says so. */

document.addEventListener('DOMContentLoaded', () => {
  if (!AdminAuth.checkAuth()) return;
  AdminAuth.initShell('ministries', 'Ministries');

  const { crudPage } = window.AdminUI;

  /** "Men's Ministry (PEMEM)" becomes "mens-ministry-pemem". The server makes slugs the same way. */
  function slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function isWebLink(value) {
    return /^https?:\/\/\S+$/i.test(value);
  }

  crudPage({
    noun: 'ministry',
    tableLabel: 'Ministries',
    tableHost: document.getElementById('ministry-table'),
    alertHost: document.getElementById('page-alert'),
    addButton: document.getElementById('add-ministry'),
    nameOf: (row) => row.name,
    columns: [
      { label: 'Name', render: (row) => row.name },
      { label: 'Slug', render: (row) => row.slug },
      { label: 'Leaders', numeric: true, render: (row) => String(row.leader_count) },
    ],
    load: async () => {
      const response = await AdminApi.get('/admin/ministries');
      return { items: response.data.items, pagination: null };
    },
    emptyText: () => 'No ministries have been added yet.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, requiredMessage: 'Enter a name.', maxLength: 150 },
      {
        name: 'slug',
        label: 'Slug',
        type: 'text',
        maxLength: 160,
        hint: 'The short name used in web addresses. It is filled in from the name; change it only if you need to. Leave it empty to have one made for you.',
        validate: (value) => (value && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
          ? 'Use only lowercase letters, numbers and single hyphens, for example "youth-ministry".'
          : ''),
      },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 5000 },
      { name: 'icon_upload', label: 'Icon image', type: 'image', hint: 'JPEG, PNG or WebP, 5 MB at most. Or give a link below instead.' },
      {
        name: 'icon_link',
        label: 'Icon link',
        type: 'url',
        maxLength: 500,
        hint: 'Used only when no image is uploaded above.',
        validate: (value) => (value && !isWebLink(value) ? 'The link must start with http:// or https://.' : ''),
      },
    ],
    // An uploaded icon is stored as a path on this site; anything else is a link.
    toForm: (row) => {
      const icon = row && row.icon_url ? row.icon_url : '';
      const uploaded = icon.startsWith('/assets/uploads/');
      return {
        name: row ? row.name : '',
        slug: row ? row.slug : '',
        description: row ? row.description : '',
        icon_upload: uploaded ? icon : '',
        icon_link: uploaded ? '' : icon,
      };
    },
    save: (values, row) => {
      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        icon_url: values.icon_upload || values.icon_link,
      };
      return row ? AdminApi.put(`/ministries/${row.id}`, payload) : AdminApi.post('/ministries', payload);
    },
    remove: (row) => AdminApi.delete(`/ministries/${row.id}`),
    // The slug follows the name as it is typed, until the slug is edited by hand.
    // When editing an existing ministry the slug is left alone.
    onFormOpen: (form, row) => {
      const nameInput = form.input('name');
      const slugInput = form.input('slug');
      let follow = !row;
      slugInput.addEventListener('input', () => { follow = slugInput.value === ''; });
      nameInput.addEventListener('input', () => {
        if (follow) slugInput.value = slugify(nameInput.value);
      });
    },
  });
});
