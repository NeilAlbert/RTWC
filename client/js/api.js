/**
 * ROYAL TEMPLE WORSHIP CENTRE - API Helper
 * Single fetch helper for the public site.
 * Base URL is same-origin (relative /api/ paths).
 * Returns { ok, data, message } for consistent handling.
 * Includes escapeHTML function.
 * Every page uses textContent or escapeHTML when rendering API data.
 * Never inject API text through innerHTML unescaped.
 */

const baseURL = '/api';

// Escape HTML special characters to prevent XSS
function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

// Common fetch options with error handling
async function fetchAPI(endpoint, options = {}) {
  const url = `${baseURL}${endpoint}`;
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, defaults);
    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        message: data.message || 'Request failed',
        status: response.status
      };
    }

    return {
      ok: true,
      data,
      message: data.message || 'Success'
    };

  } catch (error) {
    console.error('API fetch error:', error);
    return {
      ok: false,
      message: 'Network error. Please try again.',
      status: 0
    };
  }
}

// Shortcuts for common GET requests
const api = {
  // Get site settings (cached response)
  settings: async () => {
    const result = await fetchAPI('/settings');
    return result.ok ? result.data : null;
  },

  // Get sermons with optional filters
  sermons: async (params = {}) => {
    const paramsStr = new URLSearchParams(params).toString();
    const endpoint = paramsStr ? `/sermons?${paramsStr}` : '/sermons';
    const result = await fetchAPI(endpoint);
    return result.ok ? result.data : null;
  },

  // Get events with optional filters
  events: async (params = {}) => {
    const paramsStr = new URLSearchParams(params).toString();
    const endpoint = paramsStr ? `/events?${paramsStr}` : '/events';
    const result = await fetchAPI(endpoint);
    return result.ok ? result.data : null;
  },

  // Get ministries
  ministries: async () => {
    const result = await fetchAPI('/ministries');
    return result.ok ? result.data : null;
  },

  // Get leadership grouped by role
  leadership: async () => {
    const result = await fetchAPI('/leadership');
    return result.ok ? result.data : null;
  },

  // Contact form submission
  contact: async (data) => {
    const result = await fetchAPI('/contact', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result;
  },

  // Prayer request submission
  prayerRequest: async (data) => {
    const result = await fetchAPI('/prayer-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result;
  },

  // Newsletter subscription
  newsletter: async (email) => {
    const result = await fetchAPI('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return result;
  }
};

// Export the escapeHTML function for use in pages
export { escapeHTML, api };