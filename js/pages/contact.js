/* Contact page: the message form and the prayer request form.
   Both send to the API, which stores the submission and emails the church office.
   A field is checked when the visitor leaves it and again when the form is sent. */

(() => {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setUpForm({ form, endpoint, fields, status, sentMessage, buildBody }) {
    const submitButton = form.querySelector('button[type="submit"]');

    function check(field) {
      const message = field.validate(field.input.value.trim());
      field.error.textContent = message;
      if (message) field.input.setAttribute('aria-invalid', 'true');
      else field.input.removeAttribute('aria-invalid');
      return !message;
    }

    fields.forEach(field => {
      field.input.addEventListener('blur', () => {
        if (field.input.value.trim() || field.input.hasAttribute('aria-invalid')) check(field);
      });
      // Clear an error as soon as it is fixed, before the visitor reaches the button.
      field.input.addEventListener('input', () => {
        if (field.input.hasAttribute('aria-invalid')) check(field);
      });
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.textContent = '';
      status.classList.remove('is-error');

      const invalid = fields.filter(field => !check(field));
      if (invalid.length > 0) {
        invalid[0].input.focus();
        return;
      }

      submitButton.disabled = true;
      let failure = 'Sorry, this could not be sent. Please try again, or phone the church office.';
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(buildBody())
        });
        if (response.status === 429) {
          failure = 'You have sent several messages in a short time. Please try again later.';
        }
        if (!response.ok) throw new Error(`${endpoint} returned HTTP ${response.status}.`);
        form.reset();
        status.textContent = sentMessage;
      } catch (error) {
        console.error('Form could not be sent.', error);
        status.classList.add('is-error');
        status.textContent = failure;
      } finally {
        submitButton.disabled = false;
        status.focus();
      }
    });
  }

  const contactName = document.getElementById('contact-name');
  const contactEmail = document.getElementById('contact-email');
  const contactMessage = document.getElementById('contact-message');

  setUpForm({
    form: document.getElementById('contact-form'),
    endpoint: '/api/contact',
    status: document.getElementById('contact-status'),
    sentMessage: 'Thank you. We received your message.',
    buildBody: () => ({
      name: contactName.value.trim(),
      email: contactEmail.value.trim(),
      message: contactMessage.value.trim(),
      website: document.getElementById('contact-website').value
    }),
    fields: [
      {
        input: contactName,
        error: document.getElementById('contact-name-error'),
        validate: value => (value.length >= 2 ? '' : 'Please enter your name.')
      },
      {
        input: contactEmail,
        error: document.getElementById('contact-email-error'),
        validate: value => (EMAIL_PATTERN.test(value) ? '' : 'Please enter an email address, such as name@gmail.com.')
      },
      {
        input: contactMessage,
        error: document.getElementById('contact-message-error'),
        validate: value => (value.length >= 5 ? '' : 'Please write your message.')
      }
    ]
  });

  const prayerName = document.getElementById('prayer-name');
  const prayerRequest = document.getElementById('prayer-request');

  setUpForm({
    form: document.getElementById('prayer-form'),
    endpoint: '/api/prayer-requests',
    status: document.getElementById('prayer-status'),
    sentMessage: 'Thank you. We received your prayer request.',
    buildBody: () => ({
      name: prayerName.value.trim(),
      request_text: prayerRequest.value.trim(),
      is_private: document.getElementById('prayer-private').checked,
      website: document.getElementById('prayer-website').value
    }),
    fields: [
      {
        input: prayerRequest,
        error: document.getElementById('prayer-request-error'),
        validate: value => (value.length >= 5 ? '' : 'Please write your prayer request.')
      }
    ]
  });
})();
