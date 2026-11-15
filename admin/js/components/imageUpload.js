/* Shared admin component: the image upload field.
   Choose a file, see a square preview, and the saved address goes into the form.
   The file's type and size are checked here first, then again by the server,
   which decides the real type from the file's contents. */

(() => {
  const { el } = window.AdminUI;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_BYTES = 5 * 1024 * 1024;

  /**
   * @param {object} options
   * @param {string} options.id  id for the file input, so the field label points at it
   * @param {string} options.describedBy  ids of the hint and error elements
   * @param {Function} options.onError  called with a message to show under the field, or '' to clear it
   */
  function createImageField({ id, describedBy, onError }) {
    let value = '';
    let uploading = false;

    const preview = el('div', { class: 'image-preview' });
    const fileInput = el('input', {
      type: 'file',
      id,
      accept: ALLOWED_TYPES.join(','),
      'aria-describedby': describedBy,
    });
    const status = el('span', { class: 'hint', role: 'status' });
    const removeButton = el('button', { type: 'button', class: 'btn-text', text: 'Remove', hidden: true });

    function render() {
      preview.replaceChildren(value
        ? el('img', { src: value, alt: 'The chosen image', width: '96', height: '96' })
        : el('span', { text: 'No image' }));
      removeButton.hidden = !value;
    }

    function setValue(next) {
      value = next || '';
      fileInput.value = '';
      status.textContent = '';
      render();
    }

    removeButton.addEventListener('click', () => {
      setValue('');
      onError('');
      fileInput.focus();
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      onError('');

      if (!ALLOWED_TYPES.includes(file.type)) {
        fileInput.value = '';
        onError('Choose a JPEG, PNG or WebP image.');
        return;
      }
      if (file.size > MAX_BYTES) {
        fileInput.value = '';
        onError('That image is larger than 5 MB. Choose a smaller one.');
        return;
      }

      const data = new FormData();
      data.append('image', file);
      uploading = true;
      status.textContent = 'Uploading.';
      try {
        const response = await window.AdminApi.upload('/admin/upload', data);
        value = response.data.url;
        status.textContent = 'Uploaded.';
        render();
      } catch (err) {
        fileInput.value = '';
        status.textContent = '';
        onError(err.status === 0 ? 'The image could not be uploaded. Check your connection and try again.' : err.message);
      } finally {
        uploading = false;
      }
    });

    render();

    return {
      element: el('div', { class: 'image-field' }, [
        preview,
        el('div', { class: 'image-field-controls' }, [fileInput, status, removeButton]),
      ]),
      focusTarget: fileInput,
      getValue: () => value,
      setValue,
      isUploading: () => uploading,
    };
  }

  window.AdminUI.createImageField = createImageField;
})();
