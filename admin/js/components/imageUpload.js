/**
 * admin/js/components/imageUpload.js: an image field for the form kit.
 *
 * The chosen file is checked in the browser first (JPEG, PNG or WebP, 5 MB at
 * most), shown as a preview, then sent to POST /api/admin/upload. The server
 * checks it again and answers with the address the image is saved at. That
 * address is the field's value. "Remove" clears the value. It does not delete
 * the file from the server: that is done on the Media page.
 *
 * createImageUpload({ name, label, help, value, required })
 * Returns a field for createForm:
 * { name, element, getValue(), setValue(), setError(), clearError(), focus(), isBusy() }.
 */
import { el, uid } from './dom.js';
import { api } from '../adminApi.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const RULES = 'JPEG, PNG or WebP, 5 MB at most.';

export function createImageUpload({ name, label, help, value = '', required = false }) {
  const id = uid('upload');
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  let current = '';
  let busy = false;
  let previewUrl = '';

  const preview = el('img', { class: 'upload-preview', alt: '', width: '96', height: '96', hidden: true });
  const input = el('input', {
    class: 'upload-input',
    type: 'file',
    id,
    accept: ALLOWED_TYPES.join(','),
    'aria-describedby': helpId,
  });
  const remove = el('button', { class: 'link-button link-button-danger', type: 'button', text: 'Remove', hidden: true });
  const status = el('p', { class: 'field-help', role: 'status' });
  const error = el('p', { class: 'field-error', id: errorId, hidden: true });

  const labelNode = el('label', { class: 'field-label', for: id, text: label });
  if (!required) labelNode.append(' ', el('span', { class: 'field-optional', text: '(optional)' }));

  const element = el('div', { class: 'field' },
    labelNode,
    el('p', { class: 'field-help', id: helpId, text: help ? `${help} ${RULES}` : RULES }),
    el('div', { class: 'upload-row' }, preview, input, remove),
    status,
    error);

  function releasePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }

  function show(src) {
    preview.hidden = !src;
    remove.hidden = !src;
    if (src) {
      preview.src = src;
      preview.alt = `${label}: current image`;
    } else {
      preview.removeAttribute('src');
      preview.alt = '';
    }
  }

  function setError(message) {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `${helpId} ${errorId}`);
  }

  function clearError() {
    error.textContent = '';
    error.hidden = true;
    input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', helpId);
  }

  function setValue(next) {
    releasePreview();
    current = next ? String(next) : '';
    input.value = '';
    show(current);
  }

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    clearError();

    if (!ALLOWED_TYPES.includes(file.type)) {
      input.value = '';
      setError('That file is not a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      input.value = '';
      setError('The image is larger than 5 MB. Choose a smaller one.');
      return;
    }

    releasePreview();
    previewUrl = URL.createObjectURL(file);
    show(previewUrl);

    busy = true;
    input.disabled = true;
    status.textContent = 'Uploading';
    const formData = new FormData();
    formData.append('image', file);
    const result = await api.upload('/admin/upload', formData);
    busy = false;
    input.disabled = false;
    status.textContent = '';

    if (!result.ok || !result.data || !result.data.url) {
      setValue(current);
      setError(result.message || 'The image could not be uploaded.');
      return;
    }
    setValue(result.data.url);
    status.textContent = 'Image uploaded.';
  });

  remove.addEventListener('click', () => {
    clearError();
    status.textContent = 'Image removed.';
    setValue('');
    input.focus();
  });

  setValue(value);

  return {
    name,
    element,
    label,
    required,
    getValue: () => current,
    setValue,
    setError,
    clearError,
    focus: () => input.focus(),
    isBusy: () => busy,
  };
}
