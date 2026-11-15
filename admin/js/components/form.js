/* Shared admin component: the form kit.
   Builds a form from a list of fields: a label above each input, optional helper
   text, and an error line tied to the input with aria-describedby. The save
   button is disabled while saving. Errors the server sends back for particular
   fields are shown under those fields. */

(() => {
  const { el, uniqueId, createImageField } = window.AdminUI;

  /**
   * @param {object} options
   * @param {Array<object>} options.fields  each: { name, label, type, required, requiredMessage,
   *        hint, options, maxLength, rows, validate(value, values) }
   *        type is text, url, date, number, textarea, select or image.
   * @param {string} [options.submitLabel]
   * @param {Function} options.onSubmit  async (values) => void. Throw an ApiError to show it.
   * @param {Function} options.onCancel
   */
  function createForm({ fields, submitLabel = 'Save', onSubmit, onCancel }) {
    const controls = {};

    function buildControl(field, id, describedBy) {
      if (field.type === 'image') {
        const image = createImageField({ id, describedBy, onError: (message) => setError(field.name, message) });
        return {
          node: image.element,
          focusTarget: image.focusTarget,
          get: image.getValue,
          set: image.setValue,
          isUploading: image.isUploading,
        };
      }

      let input;
      if (field.type === 'textarea') {
        input = el('textarea', { rows: String(field.rows || 4) });
      } else if (field.type === 'select') {
        input = el('select', {}, field.options.map(([value, text]) => new Option(text, value)));
      } else {
        input = el('input', { type: field.type || 'text', min: field.type === 'number' ? '0' : null });
      }
      input.id = id;
      input.name = field.name;
      input.setAttribute('aria-describedby', describedBy);
      if (field.maxLength) input.maxLength = field.maxLength;
      if (field.required) input.setAttribute('aria-required', 'true');

      return {
        node: input,
        focusTarget: input,
        get: () => input.value,
        set: (value) => { input.value = value === null || value === undefined ? '' : value; },
        isUploading: () => false,
      };
    }

    const groups = fields.map((field) => {
      const id = uniqueId(`field-${field.name}`);
      const hintId = `${id}-hint`;
      const errorId = `${id}-error`;
      const error = el('span', { class: 'field-error', id: errorId });
      const control = buildControl(field, id, field.hint ? `${hintId} ${errorId}` : errorId);
      const group = el('div', { class: 'form-group' }, [
        el('label', { for: id, text: field.label }),
        control.node,
        field.hint ? el('span', { class: 'hint', id: hintId, text: field.hint }) : '',
        error,
      ]);
      controls[field.name] = { ...control, field, group, error };
      return group;
    });

    const formError = el('div', { class: 'alert alert-error', role: 'alert' });
    const submitButton = el('button', { type: 'submit', class: 'btn btn-primary', text: submitLabel });
    const cancelButton = el('button', { type: 'button', class: 'btn btn-outline', text: 'Cancel', on: { click: onCancel } });
    const form = el('form', { class: 'kit-form', novalidate: true }, [
      el('div', { class: 'kit-form-fields' }, groups),
      formError,
      el('div', { class: 'form-actions' }, [submitButton, cancelButton]),
    ]);

    function setError(name, message) {
      const control = controls[name];
      if (!control) return;
      control.error.textContent = message || '';
      control.error.classList.toggle('visible', Boolean(message));
      control.focusTarget.classList.toggle('invalid', Boolean(message));
      if (message) control.focusTarget.setAttribute('aria-invalid', 'true');
      else control.focusTarget.removeAttribute('aria-invalid');
    }

    function setFormError(message) {
      formError.textContent = message || '';
      formError.classList.toggle('visible', Boolean(message));
    }

    function clearErrors() {
      Object.keys(controls).forEach((name) => setError(name, ''));
      setFormError('');
    }

    function isVisible(name) {
      return !controls[name].group.hidden;
    }

    function getValues() {
      const values = {};
      Object.keys(controls).forEach((name) => {
        const raw = controls[name].get();
        values[name] = typeof raw === 'string' && controls[name].field.type !== 'textarea' ? raw.trim() : raw;
      });
      return values;
    }

    function setValues(values) {
      Object.keys(controls).forEach((name) => controls[name].set(values[name]));
      clearErrors();
    }

    /** Checks the form in the browser. Returns the first field with a problem, or null. */
    function validate(values) {
      let first = null;
      Object.keys(controls).forEach((name) => {
        if (!isVisible(name)) return;
        const { field } = controls[name];
        let message = '';
        if (field.required && !String(values[name] || '').trim()) {
          message = field.requiredMessage || `Enter ${field.label.toLowerCase()}.`;
        } else if (field.validate) {
          message = field.validate(values[name], values) || '';
        }
        setError(name, message);
        if (message && !first) first = name;
      });
      return first;
    }

    function setSaving(saving) {
      submitButton.disabled = saving;
      submitButton.textContent = saving ? 'Saving' : submitLabel;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitButton.disabled) return;
      setFormError('');

      if (Object.values(controls).some((control) => control.isUploading())) {
        setFormError('Wait for the image to finish uploading, then save again.');
        return;
      }

      const values = getValues();
      const firstInvalid = validate(values);
      if (firstInvalid) {
        controls[firstInvalid].focusTarget.focus();
        return;
      }

      setSaving(true);
      try {
        await onSubmit(values);
      } catch (err) {
        // Field errors from the server go under their fields. Anything else goes in the banner.
        const unplaced = [];
        (err.errors || []).forEach(({ field, message }) => {
          if (controls[field] && isVisible(field)) {
            if (!controls[field].error.textContent) setError(field, message);
          } else {
            unplaced.push(message);
          }
        });
        const firstServerError = (err.errors || []).map((item) => item.field).find((name) => controls[name] && isVisible(name));
        if (firstServerError) controls[firstServerError].focusTarget.focus();
        if (unplaced.length > 0 || !firstServerError) {
          setFormError(unplaced[0] || err.message || 'This could not be saved. Please try again.');
        }
      } finally {
        setSaving(false);
      }
    });

    return {
      element: form,
      getValues,
      setValues,
      setError,
      /** Shows or hides a field. A hidden field is not validated. */
      setFieldVisible(name, visible) {
        controls[name].group.hidden = !visible;
        if (!visible) setError(name, '');
      },
      /** The input (or file input) of a field, for adding listeners. */
      input: (name) => controls[name].focusTarget,
      focusFirst() {
        controls[fields[0].name].focusTarget.focus();
      },
    };
  }

  window.AdminUI.createForm = createForm;
})();
