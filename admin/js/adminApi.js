/**
 * admin/js/adminApi.js: the only place the admin talks to the server.
 *
 * Every call resolves to { ok, status, data, message, errors } and never throws.
 * - The Bearer token is attached to each request.
 * - A 401 ends the session and opens the login page. The sign-in request itself
 *   is the one exception: there a 401 means a wrong email or password, and
 *   redirecting would loop.
 * - status is 0 when the server could not be reached.
 * - errors is the list of { field, message } the server sent for a rejected form.
 */
const API_BASE = '/api';
const UNREACHABLE = 'Cannot reach the server. Please try again.';
const SESSION_EXPIRED = 'Your session expired. Please log in again.';
const FAILED = 'The server could not complete the request. Please try again.';

const auth = window.AdminAuth;

async function request(method, path, body, { isLogin = false } = {}) {
  const isFile = body instanceof FormData;
  const headers = {};
  // A file upload sets its own Content-Type, with the boundary the server needs.
  if (body !== undefined && !isFile) headers['Content-Type'] = 'application/json';
  const token = auth.getToken();
  if (token && !isLogin) headers.Authorization = `Bearer ${token}`;

  let payload = null;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined || isFile ? body : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    return { ok: false, status: 0, data: null, message: UNREACHABLE, errors: [] };
  }

  try {
    payload = await response.json();
  } catch (err) {
    // Not JSON, for example a proxy's error page. The status decides the result.
    payload = null;
  }

  if (response.status === 401 && !isLogin) {
    auth.endSession('expired');
    return { ok: false, status: 401, data: null, message: SESSION_EXPIRED, errors: [] };
  }

  const ok = response.ok && Boolean(payload) && payload.success !== false;
  const data = payload && payload.data !== undefined ? payload.data : null;
  const serverMessage = payload && typeof payload.message === 'string' ? payload.message : '';
  return {
    ok,
    status: response.status,
    data: ok ? data : null,
    message: serverMessage || (ok ? '' : FAILED),
    errors: !ok && data && Array.isArray(data.errors) ? data.errors : [],
  };
}

/** Builds "?a=1&b=2" from an object, leaving out empty values. */
export function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  /** Sends one file. formData is a FormData holding it. */
  upload: (path, formData) => request('POST', path, formData),
  /** The password is sent exactly as typed. */
  login: (email, password) => request('POST', '/auth/login', { email, password }, { isLogin: true }),
};
