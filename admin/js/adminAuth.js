/**
 * =============================================================================
 * admin/js/adminAuth.js: authentication + shared dashboard shell.
 *
 * - login(): calls POST /api/auth/login, stores the JWT in sessionStorage
 *   (cleared when the tab closes, which is safer on a shared church office computer).
 * - checkAuth(): guards every admin page; redirects to login.html if the token
 *   is missing or expired (client-side exp check).
 * - logout(): clears the token and redirects.
 * - initShell(): renders the shared sidebar + topbar (nav links, user name,
 *   logout button) into placeholder elements on protected pages.
 * =============================================================================
 */

const AdminAuth = (() => {
  const TOKEN_KEY = 'rtwc_admin_token';
  const ADMIN_KEY = 'rtwc_admin';
  const LOGIN_URL = 'login.html';

  /** Decode the JWT payload without verification (used only for exp check). */
  function decodePayload(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function getAdmin() {
    try {
      return JSON.parse(sessionStorage.getItem(ADMIN_KEY));
    } catch {
      return null;
    }
  }

  function setSession(token, admin) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin || {}));
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
  }

  /** True if a token exists and has not expired (client-side check). */
  function hasValidToken() {
    const token = getToken();
    if (!token) return false;
    const payload = decodePayload(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 > Date.now();
  }

  /**
   * Route protection: call at the top of every protected admin page.
   * Redirects to login.html and returns false when the token is missing/expired.
   */
  function checkAuth() {
    if (!hasValidToken()) {
      clearSession();
      window.location.replace(LOGIN_URL);
      return false;
    }
    return true;
  }

  /** POST /api/auth/login → store token + admin, return admin. */
  async function login(email, password) {
    const res = await AdminApi.post('/auth/login', { email, password });
    if (!res.success || !res.data || !res.data.token) {
      throw new Error(res.message || 'You could not be signed in.');
    }
    setSession(res.data.token, res.data.admin);
    return res.data.admin;
  }

  /** Clear the token and redirect to login.html. */
  function logout() {
    clearSession();
    window.location.href = LOGIN_URL;
  }

  /**
   * Wire AdminApi 401 handling to logout once, at app startup.
   * Call before any page fetches data.
   */
  function initUnauthorizedHandler() {
    AdminApi.setUnauthorizedHandler(() => logout());
  }

  // -------------------------------------------------------------------------
  // Shared shell (sidebar + topbar)
  // -------------------------------------------------------------------------
  // Only pages that exist are listed. Add an entry here when a new admin page is built.
  const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { key: 'settings', label: 'Settings', href: 'settings.html' },
  ];

  /**
   * Render sidebar + topbar into the page's #admin-sidebar / #admin-topbar.
   * @param {string} activeKey - nav key of the current page
   * @param {string} pageTitle - title shown in the topbar
   */
  function initShell(activeKey, pageTitle) {
    initUnauthorizedHandler();

    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
      const nav = NAV_ITEMS.map((item) => {
        const active = item.key === activeKey ? ' active' : '';
        const ariaCurrent = item.key === activeKey ? ' aria-current="page"' : '';
        return `<a href="${item.href}" class="nav-item${active}"${ariaCurrent}>${item.label}</a>`;
      }).join('');

      sidebar.innerHTML = `
        <div class="sidebar-brand">
          <div class="brand-church">Royal Temple</div>
          <div class="brand-role">Admin</div>
        </div>
        <nav class="sidebar-nav" aria-label="Admin navigation">${nav}</nav>
        <div class="sidebar-footer">
          <a href="${LOGIN_URL}" class="sidebar-logout-link" id="sidebar-logout-link">Log out</a>
        </div>
      `;

      const sidebarLogout = document.getElementById('sidebar-logout-link');
      if (sidebarLogout) {
        sidebarLogout.addEventListener('click', (e) => {
          e.preventDefault();
          logout();
        });
      }
    }

    const topbar = document.getElementById('admin-topbar');
    if (topbar) {
      const admin = getAdmin();
      topbar.innerHTML = `
        <div class="topbar-left">
          <button type="button" class="sidebar-toggle" id="sidebar-toggle">Menu</button>
          <span class="topbar-title">${pageTitle || 'Dashboard'}</span>
        </div>
        <div class="topbar-user">
          <span class="user-name">${admin && admin.name ? `Signed in as ${admin.name}` : ''}</span>
          <button type="button" class="btn btn-outline btn-sm" id="logout-btn">Log out</button>
        </div>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) logoutBtn.addEventListener('click', () => logout());

      const toggle = document.getElementById('sidebar-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          const sidebarEl = document.getElementById('admin-sidebar');
          if (sidebarEl) sidebarEl.classList.toggle('open');
        });
      }
    }
  }

  return {
    getToken,
    getAdmin,
    hasValidToken,
    checkAuth,
    login,
    logout,
    initShell,
    initUnauthorizedHandler,
  };
})();

// Expose globally.
window.AdminAuth = AdminAuth;
