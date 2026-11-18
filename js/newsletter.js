/* Newsletter sign-up. One component for the whole public site: every element with
   data-newsletter gets the form, so the footer and the home page share this code.

   Options, as attributes on the element:
     data-newsletter-heading  the heading text (default "Stay in touch")
     data-newsletter-level    the heading level, 2 or 3 (default 2)
     data-newsletter-theme    "navy" on a navy band: white input, gold button

   Sends { email, website } to POST /api/newsletter/subscribe. "website" is a
   hidden honeypot that people never see; the server ignores any request that
   fills it in. All text is set with textContent. */

(() => {
  const ENDPOINT = '/api/newsletter/subscribe';
  const MAX_LENGTH = 254;
  // A practical check before sending: one @, no spaces or markup, a dot in the domain.
  const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:".]+(\.[^\s@<>()[\]\\,;:".]+)+$/;

  const TEXT = {
    help: 'We send occasional church news. You can ask to be removed at any time.',
    empty: 'Enter your email address.',
    invalid: 'Enter an email address such as name@example.com.',
    tooLong: `Use an email address of ${MAX_LENGTH} characters or fewer.`,
    success: 'Thank you. You are on our list.',
    rateLimited: 'Too many attempts. Please try again in a few minutes.',
    failed: 'We could not subscribe you right now. Please try again.',
  };

  let count = 0;

  function make(tag, attributes = {}, text) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function checkEmail(value) {
    if (!value) return TEXT.empty;
    if (value.length > MAX_LENGTH) return TEXT.tooLong;
    if (!EMAIL.test(value)) return TEXT.invalid;
    return '';
  }

  function render(host) {
    count += 1;
    const id = `newsletter-${count}`;
    const navy = host.dataset.newsletterTheme === 'navy';
    const level = host.dataset.newsletterLevel === '3' ? 'h3' : 'h2';

    const heading = make(level, { id: `${id}-heading`, class: 'newsletter-heading' }, host.dataset.newsletterHeading || 'Stay in touch');

    const label = make('label', { for: `${id}-email` }, 'Email address');
    const input = make('input', {
      type: 'email',
      id: `${id}-email`,
      name: 'email',
      autocomplete: 'email',
      inputmode: 'email',
      spellcheck: 'false',
      required: '',
      'aria-describedby': `${id}-error ${id}-help`,
    });
    const button = make('button', { type: 'submit', class: navy ? 'button-gold' : 'button' }, 'Subscribe');
    const row = make('div', { class: 'newsletter-row' });
    row.append(input, button);
    const error = make('p', { id: `${id}-error`, class: 'newsletter-error' });

    // The honeypot: off screen, out of the tab order, hidden from screen readers.
    const trap = make('div', { class: 'newsletter-trap', 'aria-hidden': 'true' });
    trap.append(
      make('label', { for: `${id}-website` }, 'Website'),
      make('input', { type: 'text', id: `${id}-website`, name: 'website', tabindex: '-1', autocomplete: 'off' }),
    );

    const status = make('p', { class: 'newsletter-status', role: 'status' });
    const help = make('p', { id: `${id}-help`, class: 'newsletter-help' }, TEXT.help);

    const form = make('form', { class: 'newsletter-form', novalidate: '', 'aria-labelledby': `${id}-heading` });
    form.append(label, row, error, trap, status, help);

    function showError(message) {
      error.textContent = message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function showStatus(message, kind) {
      status.textContent = message;
      status.dataset.kind = kind || '';
    }

    let sending = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending) return;

      const email = input.value.trim();
      showStatus('');
      const problem = checkEmail(email);
      showError(problem);
      if (problem) {
        input.focus();
        return;
      }

      sending = true;
      button.disabled = true;
      button.textContent = 'Subscribing...';
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, website: form.elements.website.value }),
        });
        const payload = await response.json().catch(() => null);

        if (response.ok && payload && payload.success) {
          form.reset();
          showStatus(TEXT.success, 'success');
        } else if (response.status === 429) {
          showStatus(TEXT.rateLimited, 'error');
        } else if (response.status === 400 && payload && payload.data && Array.isArray(payload.data.errors)) {
          const fieldError = payload.data.errors.find(item => item.field === 'email');
          showError(fieldError ? fieldError.message : TEXT.invalid);
          input.focus();
        } else {
          showStatus(TEXT.failed, 'error');
        }
      } catch (networkError) {
        showStatus(TEXT.failed, 'error');
      } finally {
        sending = false;
        button.disabled = false;
        button.textContent = 'Subscribe';
      }
    });

    // The error clears once the address is corrected.
    input.addEventListener('input', () => {
      if (error.textContent && !checkEmail(input.value.trim())) showError('');
    });

    host.classList.add('newsletter');
    if (navy) host.classList.add('newsletter-navy');
    host.replaceChildren(heading, form);
  }

  document.querySelectorAll('[data-newsletter]').forEach(render);
})();
