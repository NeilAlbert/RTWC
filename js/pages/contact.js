// BACKEND REMOVED — see contact form and prayer request previously called /api/contact and /api/prayer-requests. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Contact & Prayer Request Page Specific JavaScript (js/pages/contact.js)
 *
 * Validation behaviour (shared by both forms):
 *  - Be liberal in what we accept: surrounding spaces, doubled spaces, a
 *    capitalised or mistyped-case email, or a trailing full stop are tidied up
 *    rather than rejected.
 *  - Nothing is flagged while the visitor is still typing a field for the
 *    first time. A field is checked when they leave it, and once it has shown
 *    an error it re-checks on every keystroke so the error clears the moment
 *    it is fixed.
 *  - On submit, focus moves to the first field that needs attention and that
 *    field shakes briefly.
 */

document.addEventListener('DOMContentLoaded', () => {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const tidyText = value => value.replace(/\s+/g, ' ').trim();
  const tidyEmail = value => value.trim().replace(/\s+/g, '').replace(/[.,;]+$/, '').toLowerCase();

  /**
   * Wire up one form.
   * @param {object} config
   * @param {HTMLFormElement} config.form
   * @param {Array<{input: HTMLElement, error: HTMLElement, normalize?: Function, validate: Function}>} config.fields
   * @param {HTMLElement} config.successEl
   */
  function setupForm({ form, fields, successEl }) {
    if (!form) return;
    let hideTimer = null;

    const setError = (field, message) => {
      field.error.textContent = message;
      if (message) field.input.setAttribute('aria-invalid', 'true');
      else field.input.removeAttribute('aria-invalid');
    };

    const check = field => {
      const message = field.validate(field.input.value);
      setError(field, message);
      return !message;
    };

    fields.forEach(field => {
      field.input.addEventListener('blur', () => {
        // Tidy the value in place so what the visitor sees is what is used.
        if (field.normalize && field.input.value) field.input.value = field.normalize(field.input.value);
        if (field.input.value.trim() || field.input.hasAttribute('aria-invalid')) check(field);
      });
      field.input.addEventListener('input', () => {
        if (field.input.hasAttribute('aria-invalid')) check(field);
      });
    });

    form.addEventListener('submit', event => {
      event.preventDefault();

      fields.forEach(field => {
        if (field.normalize) field.input.value = field.normalize(field.input.value);
      });

      const invalid = fields.filter(field => !check(field));
      if (invalid.length > 0) {
        const first = invalid[0].input;
        first.focus();
        first.classList.remove('is-shaking');
        void first.offsetWidth; // restart the animation if it is already running
        first.classList.add('is-shaking');
        first.addEventListener('animationend', () => first.classList.remove('is-shaking'), { once: true });
        return;
      }

      /*
        BACKEND REMOVED NOTE:
        This form currently displays an on-page confirmation message.
        Reconnect to a real backend API (POST /api/contact or /api/prayer-requests)
        or a form service (e.g. Formspree) later.
      */
      form.reset();
      fields.forEach(field => setError(field, ''));

      successEl.textContent = "Thank you, we'll be in touch.";
      successEl.classList.add('no-display');
      void successEl.offsetWidth; // replay the entrance if submitted twice in a row
      successEl.classList.remove('no-display');
      successEl.style.display = '';
      successEl.focus({ preventScroll: true });
      successEl.scrollIntoView({ block: 'nearest', behavior: window.RTWC?.reducedMotion.matches ? 'auto' : 'smooth' });

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => successEl.classList.add('no-display'), 8000);
    });
  }

  // 1. General contact form
  setupForm({
    form: document.getElementById('contact-form'),
    successEl: document.getElementById('contact-success-msg'),
    fields: [
      {
        input: document.getElementById('contact-name'),
        error: document.getElementById('err-name'),
        normalize: tidyText,
        validate: value => (tidyText(value) ? '' : 'Please enter your full name.')
      },
      {
        input: document.getElementById('contact-email'),
        error: document.getElementById('err-email'),
        normalize: tidyEmail,
        validate: value => {
          const email = tidyEmail(value);
          if (!email) return 'Please enter your email address.';
          if (!EMAIL_PATTERN.test(email)) return 'That email looks incomplete. It should look like name@example.com.';
          return '';
        }
      },
      {
        input: document.getElementById('contact-message'),
        error: document.getElementById('err-message'),
        validate: value => (value.trim() ? '' : 'Please enter your message.')
      }
    ]
  });

  // 2. Prayer request form
  setupForm({
    form: document.getElementById('prayer-form'),
    successEl: document.getElementById('prayer-success-msg'),
    fields: [
      {
        input: document.getElementById('prayer-request'),
        error: document.getElementById('err-prayer'),
        validate: value => (value.trim() ? '' : 'Please describe your prayer request.')
      }
    ]
  });
});
