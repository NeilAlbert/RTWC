// ADMIN API MODULE
// Makes authenticated API calls to the Royal Temple backend.
// Attaches JWT token to Authorization header automatically.

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */
const API_BASE = '';  // Base API URL

/* ==========================================================================
   HELPER: Get auth headers
   ========================================================================== */
function getAuthHeaders() {
  const token = localStorage.getItem('rtwc_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/* ==========================================================================
   SERMON CRUD
   ========================================================================== */
export async function apiGetSermons(filters = {}) {
  const params = new URLSearchParams();
  if (filters.speaker) params.append('speaker', filters.speaker);
  if (filters.date) params.append('date', filters.date);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await fetch(`${API_BASE}/api/sermons?${params}`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

export async function apiCreateSermon(sermonData) {
  const response = await fetch(`${API_BASE}/api/sermons`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(sermonData)
  });
  const data = await response.json();
  return data;
}

export async function apiUpdateSermon(id, sermonData) {
  const response = await fetch(`${API_BASE}/api/sermons/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(sermonData)
  });
  const data = await response.json();
  return data;
}

export async function apiDeleteSermon(id) {
  const response = await fetch(`${API_BASE}/api/sermons/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   EVENT CRUD
   ========================================================================== */
export async function apiGetEvents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.upcoming !== undefined) params.append('upcoming', filters.upcoming);
  if (filters.page) params.append('page', filters.page);

  const response = await fetch(`${API_BASE}/api/events?${params}`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

export async function apiCreateEvent(eventData) {
  const response = await fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  return data;
}

export async function apiUpdateEvent(id, eventData) {
  const response = await fetch(`${API_BASE}/api/events/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  return data;
}

export async function apiDeleteEvent(id) {
  const response = await fetch(`${API_BASE}/api/events/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   MINISTRY CRUD
   ========================================================================== */
export async function apiGetMinistries() {
  const response = await fetch(`${API_BASE}/api/ministries`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

export async function apiCreateMinistry(ministryData) {
  const response = await fetch(`${API_BASE}/api/ministries`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(ministryData)
  });
  const data = await response.json();
  return data;
}

export async function apiUpdateMinistry(id, ministryData) {
  const response = await fetch(`${API_BASE}/api/ministries/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(ministryData)
  });
  const data = await response.json();
  return data;
}

export async function apiDeleteMinistry(id) {
  const response = await fetch(`${API_BASE}/api/ministries/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   CONTACT MESSAGES
   ========================================================================== */
export async function apiGetContactMessages(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page);

  const response = await fetch(`${API_BASE}/api/contact?${params}`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

export async function apiUpdateMessageStatus(id, status) {
  const response = await fetch(`${API_BASE}/api/contact/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   PRAYER REQUESTS
   ========================================================================== */
export async function apiGetPrayerRequests(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page);

  const response = await fetch(`${API_BASE}/api/prayer-requests?${params}`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

export async function apiUpdateRequestStatus(id, status) {
  const response = await fetch(`${API_BASE}/api/prayer-requests/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   GIVING RECORDS
   ========================================================================== */
export async function apiGetGivingHistory(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.page) params.append('page', filters.page);

  const response = await fetch(`${API_BASE}/api/giving/history?${params}`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   SITE SETTINGS
   ========================================================================== */
export async function apiGetSettings() {
  const response = await fetch(`${API_BASE}/api/settings`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}

export async function apiUpdateSettings(settingsData) {
  const response = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settingsData)
  });
  const data = await response.json();
  return data;
}

/* ==========================================================================
   ADMIN PROFILE
   ========================================================================== */
export async function apiGetAdminProfile() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  return data;
}