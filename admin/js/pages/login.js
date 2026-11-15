/* Admin login page. */

document.addEventListener('DOMContentLoaded', () => {
  if (AdminAuth.hasValidToken()) {
    window.location.replace('dashboard.html');
    return;
  }

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errEmail = document.getElementById('err-email');
  const errPassword = document.getElementById('err-password');
  const errorAlert = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-btn');

  function showFieldError(input, el, message) {
    el.textContent = message || '';
    el.classList.toggle('visible', Boolean(message));
    input.classList.toggle('invalid', Boolean(message));
  }

  function clearErrors() {
    showFieldError(emailInput, errEmail, '');
    showFieldError(passwordInput, errPassword, '');
    errorAlert.classList.remove('visible');
    errorAlert.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let valid = true;

    if (!email) {
      showFieldError(emailInput, errEmail, 'Please enter your email address.');
      valid = false;
    } else if (!emailRegex.test(email)) {
      showFieldError(emailInput, errEmail, 'That does not look like an email address.');
      valid = false;
    }

    if (!password) {
      showFieldError(passwordInput, errPassword, 'Please enter your password.');
      valid = false;
    }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in';

    try {
      await AdminAuth.login(email, password);
      window.location.replace('dashboard.html');
    } catch (err) {
      // One message per kind of failure. A wrong email and a wrong password read the same.
      let message = 'You could not be signed in. Please try again.';
      if (err.status === 401) message = 'Invalid email or password';
      else if (err.status === 429) message = 'Too many attempts. Please try again in a few minutes.';
      else if (err.status === 0) message = 'Cannot reach the server. Please try again.';
      else if (err.status >= 500) message = 'The server has a problem and could not sign you in. Please try again later.';
      errorAlert.textContent = message;
      errorAlert.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
});
