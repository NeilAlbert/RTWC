/**
 * admin/js/adminAuth.js: the session and the page guard.
 *
 * Loaded in the <head> of every admin page, before anything is drawn.
 * - The token lives in sessionStorage, so closing the tab signs the admin out.
 * - Every page except the login page is guarded: without a live token the
 *   browser is sent to the login page. The login page (marked with
 *   data-admin-page="login" on <html>) never runs that check, so there is no
 *   redirect loop. With a live token it goes straight to the dashboard.
 * - After 30 minutes without a click, key press or scroll the admin is signed out.
 * - The reason for a sign-out is kept for the login page to show once.
 *
 * The token's expiry is only read here, never trusted: the server checks every
 * request. Requests to the server are made in adminApi.js, not here.
 */
(function () {
  'use strict';

  var TOKEN_KEY = 'rtwc_admin_token';
  var ACTIVE_KEY = 'rtwc_admin_last_active';
  var NOTICE_KEY = 'rtwc_admin_notice';
  var LOGIN_URL = '/admin/login.html';
  var HOME_URL = '/admin/dashboard.html';
  var IDLE_LIMIT_MS = 30 * 60 * 1000;
  var CHECK_EVERY_MS = 15 * 1000;

  var isLoginPage = document.documentElement.getAttribute('data-admin-page') === 'login';
  var lastWrite = 0;

  /* sessionStorage throws when the browser blocks it. The admin then stays signed out. */
  function read(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function getToken() {
    return read(TOKEN_KEY);
  }

  /** When the token says it expires, in milliseconds, or 0 if it cannot be read. */
  function tokenExpiry(token) {
    try {
      var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var payload = JSON.parse(window.atob(part));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
    } catch (err) {
      return 0;
    }
  }

  function hasLiveToken() {
    var token = getToken();
    return Boolean(token) && tokenExpiry(token) > Date.now();
  }

  function isIdle() {
    var last = Number(read(ACTIVE_KEY));
    return last > 0 && Date.now() - last > IDLE_LIMIT_MS;
  }

  function markActive() {
    var now = Date.now();
    if (now - lastWrite < 5000) return;
    lastWrite = now;
    write(ACTIVE_KEY, String(now));
  }

  /** Stores a token from a sign-in or a password change. False when the browser refuses. */
  function startSession(token) {
    lastWrite = 0;
    var stored = write(TOKEN_KEY, token);
    markActive();
    return stored;
  }

  /**
   * Forgets the token and opens the login page.
   * reason: 'expired', 'idle' or 'logged-out'. The login page shows the matching message.
   */
  function endSession(reason) {
    write(TOKEN_KEY, null);
    write(ACTIVE_KEY, null);
    if (reason) write(NOTICE_KEY, reason);
    if (!isLoginPage) window.location.replace(LOGIN_URL);
  }

  /** The reason for the last sign-out, read once. */
  function takeNotice() {
    var reason = read(NOTICE_KEY);
    write(NOTICE_KEY, null);
    return reason;
  }

  function checkSession() {
    if (!getToken()) return;
    if (!hasLiveToken()) endSession('expired');
    else if (isIdle()) endSession('idle');
  }

  window.AdminAuth = {
    getToken: getToken,
    startSession: startSession,
    endSession: endSession,
    takeNotice: takeNotice,
    homeUrl: HOME_URL,
  };

  if (isLoginPage) {
    // Never redirects to itself. A stale token is dropped. A live one goes to the dashboard.
    checkSession();
    if (hasLiveToken()) window.location.replace(HOME_URL);
    return;
  }

  if (!getToken()) {
    endSession(null);
    return;
  }
  checkSession();
  if (!getToken()) return;

  markActive();
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (name) {
    window.addEventListener(name, markActive, { passive: true, capture: true });
  });
  window.setInterval(checkSession, CHECK_EVERY_MS);
  // Timers are slowed in a background tab, so the check also runs on return to it.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) checkSession();
  });
})();
