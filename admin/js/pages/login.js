/**
 * admin/js/pages/login.js: the login form.
 *
 * adminAuth.js has already run in the <head>: with a live token it has sent the
 * browser to the dashboard, and it never redirects this page to itself.
 */
import { api } from '../adminApi.js';

const auth = window.AdminAuth;

const NOTICES = {
  expired: 'Your session expired. Please log in again.',
  idle: 'You were logged out after 30 minutes without activity.',
  'logged-out': 'You have logged out.',
};

const form = document.getElementById('login-form');
const email = document.getElementById('login-email');
const password = document.getElementById('login-password');
const submit = document.getElementById('login-submit');
const notice = document.getElementById('login-notice');
const error = document.getElementById('login-error');

function showBanner(node, message) {
  node.textContent = message;
  node.hidden = !message;
}

function setFieldError(input, message) {
  const node = document.getElementById(`${input.id}-error`);
  node.textContent = message;
  node.hidden = !message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', node.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

/** The message for a failed sign-in, by what the server answered. */
function failureMessage(result) {
  if (result.status === 0) return 'Cannot reach the server. Please try again.';
  if (result.status === 401) return 'Invalid email or password';
  if (result.status === 429) return 'Too many attempts. Please try again in a few minutes.';
  return 'The server has a problem and could not log you in. Please try again later.';
}

showBanner(notice, NOTICES[auth.takeNotice()] || '');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showBanner(error, '');
  showBanner(notice, '');

  // The password is sent exactly as typed. Only the email is trimmed.
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  setFieldError(email, emailValue ? '' : 'Enter your email address.');
  setFieldError(password, passwordValue ? '' : 'Enter your password.');
  if (!emailValue) {
    email.focus();
    return;
  }
  if (!passwordValue) {
    password.focus();
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Logging in';
  const result = await api.login(emailValue, passwordValue);

  if (result.ok && result.data && result.data.token) {
    if (auth.startSession(result.data.token)) {
      window.location.replace(auth.homeUrl);
      return;
    }
    showBanner(error, 'This browser is blocking the storage the admin needs to keep you logged in. Allow site data for this address and try again.');
  } else {
    showBanner(error, failureMessage(result));
    password.value = '';
    password.focus();
  }
  submit.disabled = false;
  submit.textContent = 'Log in';
});
