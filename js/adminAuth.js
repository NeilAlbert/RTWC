// ADMIN AUTHENTICATION MODULE
// Connects to /api/auth/login and /api/auth/logout backend endpoints.
// Manages JWT storage, session validation, and route protection.

/** ==========================================================================
   CONFIGURATION
   ========================================================================== */
const API_BASE = '';  // Base API URL (same origin by default)

const TOKEN_KEY = 'rtwc_admin_token';
const USER_KEY = 'rtwc_admin_user';

/** ==========================================================================
   LOGIN HANDLER
   ========================================================================== */
async function attemptLogin(credentials = null) {
  // If credentials not provided, gather from login form
  if (!credentials) {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value.trim();

    if (!email || !password) {
      showError('Please enter both email and password.');
      return false;
    }

    credentials = { email, password };
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Generic message — do not reveal whether email exists
      showError('Invalid email or password.');
      return false;
    }

    // Store JWT token and user info
    const token = data.data.token;
    const admin = data.data.admin;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(admin));

    // Dispatch login event for other scripts to listen to
    const loginEvent = new CustomEvent('rtwc:login', {
      detail: { admin, token }
    });
    window.dispatchEvent(loginEvent);

    return true;
  } catch (err) {
    showError('Login failed. Please try again later.');
    return false;
  }
}

/** ==========================================================================
   LOGOUT HANDLER
   ========================================================================== */
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Dispatch logout event
  const logoutEvent = new CustomEvent('rtwc:logout');
  window.dispatchEvent(logoutEvent);

  // Return to login page
  window.location.href = 'login.html';
}

/** ==========================================================================
   AUTH STATE CHECK & PROTECTION
   ========================================================================== */
function checkAuth(onAuthChanged) {
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);

  if (!token || !userStr) {
    // Not logged in
    if (onAuthChanged) onAuthChanged(false);
    return { isAuthenticated: false, admin: null };
  }

  try {
    const user = JSON.parse(userStr);
    // Optionally verify token with a silent API call
    // or trust the localStorage token (stateless JWT)

    if (onAuthChanged) onAuthChanged(true);
    return { isAuthenticated: true, admin: user };
  } catch (e) {
    // Corrupted storage — clear and treat as unauthenticated
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (onAuthChanged) onAuthChanged(false);
    return { isAuthenticated: false, admin: null };
  }
}

/** ==========================================================================
   ERROR DISPLAY
   ========================================================================== */
function showError(message) {
  const errorBox = document.getElementById('login-error');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }
}

/** ==========================================================================
   EXPORT PUBLIC API
   ========================================================================== */
window.RTWCAuth = {
  attemptLogin,
  logout,
  checkAuth,
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getAdmin: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null')
};