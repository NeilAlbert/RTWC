/**
 * admin/js/components/form.js: the form kit.
 *
 * createField({
 *   name, label,
 *   type,        'text' (default), 'email', 'url', 'password', 'number', 'date',
 *                'textarea', 'select' or 'checkbox'
 *   required,    false by default. An optional field says "(optional)" after its label,
 *                unless hideOptional is true (for a field that is only sometimes needed)
 *   requiredMessage,   the error shown when a required field is empty
 *   help,        helper text under the label
 *   value, maxLength, autocomplete, rows, min, max,
 *   options,     [{ value, label }] for a select
 *   validate(value, values)   returns an error message, or '' when the value is fine
 * })
 * Returns { name, element, input, getValue(), setValue(), setError(), clearError(), focus() }.
 * Values are returned exactly as typed. Nothing here trims or changes a password.
 *
 * createForm({
 *   fields,        field configs, or fields already built (such as an image upload)
 *   submitLabel,   'Save changes' by default
 *   onSubmit(values)   async. Returns the adminApi result { ok, message, errors }
 *   onCancel,      adds a Cancel button
 *   sticky,        true keeps the buttons in view on a long form
 * })
 * Returns { element, fields, getValues(), setValues(), setErrors(), isDirty(), markClean(), destroy() }.
 *
 * The form shows errors beside their fields and in a banner at the top, disables
 * the submit button while saving, and warns before the page is left with unsaved
 * changes. Call destroy() when the form is thrown away, so that warning stops.
 */
import { el, uid } from './dom.js';

export function createField(config) {
  const {
    name, label, type = 'text', required = false, help, value, maxLength, autocomplete, rows, min, max, options = [], validate, requiredMessage, hideOptional = false,
  } = config;
  const id = uid('field');
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const isCheckbox = type === 'checkbox';

  let input;
  if (type === 'textarea') {
    input = el('textarea', { class: 'input', rows: rows || 5 });
  } else if (type === 'select') {
    input = el('select', { class: 'input' });
    options.forEach((option) => input.append(el('option', { value: option.value, text: option.label })));
  } else {
    input = el('input', { class: isCheckbox ? null : 'input', type, min, max });
  }
  input.id = id;
  input.name = name;
  if (required && !isCheckbox) input.required = true;
  if (maxLength) input.maxLength = maxLength;
  if (autocomplete) input.autocomplete = autocomplete;

  const error = el('p', { class: 'field-error', id: errorId, hidden: true });
  const helpText = help ? el('p', { class: 'field-help', id: helpId, text: help }) : null;

  function describe(hasError) {
    const ids = [help ? helpId : '', hasError ? errorId : ''].filter(Boolean).join(' ');
    if (ids) input.setAttribute('aria-describedby', ids);
    else input.removeAttribute('aria-describedby');
  }
  describe(false);

  const labelNode = el('label', { class: 'field-label', for: id, text: label });
  if (!required && !isCheckbox && !hideOptional) labelNode.append(' ', el('span', { class: 'field-optional', text: '(optional)' }));

  const element = isCheckbox
    ? el('div', { class: 'field' }, el('div', { class: 'field-check' }, input, labelNode), helpText, error)
    : el('div', { class: 'field' }, labelNode, helpText, input, error);

  const field = {
    name,
    element,
    input,
    required,
    requiredMessage,
    label,
    validate,
    getValue: () => (isCheckbox ? input.checked : input.value),
    setValue(next) {
      if (isCheckbox) input.checked = Boolean(next);
      else input.value = next === null || next === undefined ? '' : String(next);
    },
    setError(message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      describe(true);
    },
    clearError() {
      error.textContent = '';
      error.hidden = true;
      input.removeAttribute('aria-invalid');
      describe(false);
    },
    focus: () => input.focus(),
  };
  if (value !== undefined) field.setValue(value);
  return field;
}

export function createForm({ fields: fieldConfigs, submitLabel = 'Save changes', onSubmit, onCancel, sticky = false }) {
  const fields = fieldConfigs.map((config) => (config.element ? config : createField(config)));
  const banner = el('div', { class: 'banner banner-error', role: 'alert', hidden: true });
  const submit = el('button', { class: 'button', type: 'submit', text: submitLabel });
  const actions = el('div', { class: sticky ? 'form-actions is-sticky' : 'form-actions' }, submit);
  if (onCancel) {
    actions.append(el('button', { class: 'button button-secondary', type: 'button', text: 'Cancel', onclick: onCancel }));
  }
  const element = el('form', { class: 'form', novalidate: true }, banner, fields.map((field) => field.element), actions);

  let cleanSnapshot = '';
  let saving = false;

  function getValues() {
    const values = {};
    fields.forEach((field) => { values[field.name] = field.getValue(); });
    return values;
  }

  function markClean() {
    cleanSnapshot = JSON.stringify(getValues());
  }

  function isDirty() {
    return JSON.stringify(getValues()) !== cleanSnapshot;
  }

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = !message;
  }

  /** Shows each { field, message } beside its field. Returns the first field that got one. */
  function setErrors(errors = []) {
    let first = null;
    errors.forEach((item) => {
      const field = fields.find((candidate) => candidate.name === item.field);
      if (!field) return;
      field.setError(item.message);
      first = first || field;
    });
    return first;
  }

  function findProblems(values) {
    const problems = [];
    fields.forEach((field) => {
      const current = values[field.name];
      let message = '';
      if (field.isBusy && field.isBusy()) message = 'Wait for the upload to finish.';
      else if (field.required && (current === '' || current === null || current === undefined)) message = field.requiredMessage || `Enter ${field.label.toLowerCase()}.`;
      else if (field.validate) message = field.validate(current, values) || '';
      if (message) problems.push({ field: field.name, message });
    });
    return problems;
  }

  element.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;

    fields.forEach((field) => field.clearError());
    showBanner('');
    const values = getValues();

    const problems = findProblems(values);
    if (problems.length > 0) {
      showBanner('Some fields need attention. Nothing was saved.');
      setErrors(problems).focus();
      return;
    }

    saving = true;
    submit.disabled = true;
    submit.textContent = 'Saving';
    const result = await onSubmit(values);
    saving = false;
    submit.disabled = false;
    submit.textContent = submitLabel;

    if (result && result.ok === false) {
      showBanner(result.message || 'The changes could not be saved.');
      const first = setErrors(result.errors);
      if (first) first.focus();
      else banner.scrollIntoView({ block: 'nearest' });
      return;
    }
    markClean();
  });

  // The browser shows its own "Leave site?" question. Its wording cannot be set.
  function warnBeforeLeaving(event) {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  }
  window.addEventListener('beforeunload', warnBeforeLeaving);

  markClean();

  return {
    element,
    fields,
    getValues,
    setValues(values) {
      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(values, field.name)) field.setValue(values[field.name]);
      });
      markClean();
    },
    setErrors,
    isDirty,
    markClean,
    destroy() {
      window.removeEventListener('beforeunload', warnBeforeLeaving);
    },
  };
}
