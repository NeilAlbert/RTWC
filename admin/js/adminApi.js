/**
 * =============================================================================
 * admin/js/adminApi.js — shared fetch wrapper for the admin dashboard.
 *
 * - Attaches "Authorization: Bearer <token>" (from sessionStorage) to every
 *   request automatically.
 * - On any 401 response, invokes the configured unauthorized handler (which
 *   clears the token and redirects to login.html — token expired).
 * - Throws descriptive errors; never fails silently.
 * - Returns the parsed JSON body, which follows the API's standard
 *   { success, data, message } shape.
 * =============================================================================
 */

/** Error class carrying the HTTP status (0 = network error). */
class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const AdminApi = (() => {
  /**
   * Base URL of the backend API.
   * The admin folder is served from the same origin as the API in production,
   * so a relative path works. Change this if the API lives elsewhere.
   */
  const API_BASE = '/api';
  const TOKEN_KEY = 'rtwc_admin_token';

  let onUnauthorized = null;

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  /** Register the handler called when the API returns 401. */
  function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
  }

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch (err) {
      throw new ApiError('Network error — could not reach the server. Please try again.', 0);
    }

    let body = null;
    try {
      body = await response.json();
    } catch (err) {
      body = null; // non-JSON response
    }

    if (response.status === 401) {
      // Prefer the server's own message (e.g. "Invalid email or password." on
      // the login page). Fall back to a session message when the body has none.
      const message = (body && (body.message || body.error))
        || 'Your session has expired. Please log in again.';
      // Only redirect for an expired/invalid session, NOT on the login page
      // where a 401 simply means wrong credentials.
      if (typeof onUnauthorized === 'function') onUnauthorized();
      throw new ApiError(message, 401);
    }

    if (!response.ok) {
      const message = (body && (body.message || body.error))
        || `Request failed with status ${response.status}.`;
      throw new ApiError(message, response.status);
    }

    return body; // { success, data, message }
  }

  return {
    setUnauthorizedHandler,
    getToken,
    get: (path) => request(path),
    post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
    put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
    patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  };
})();

// Expose globally so adminAuth.js and page scripts can use it.
window.AdminApi = AdminApi;
window.ApiError = ApiError;
