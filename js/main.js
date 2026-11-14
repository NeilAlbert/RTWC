/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Shared JavaScript (js/main.js)
 *
 * Runs on every public page:
 *   1. Footer year
 *   2. Mobile navigation (toggle, backdrop, Escape, focus handling)
 *   3. Header shadow on scroll
 *   4. Current-page highlight
 *   5. Scroll reveal
 * Also exposes window.RTWC.dialog — shared open/close behaviour for the sermon
 * modal and gallery lightbox (focus trap, focus return, scroll lock).
 */

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ==========================================================================
     SHARED DIALOG HELPER
     Keeps keyboard focus inside an open dialog, locks page scroll behind it,
     and returns focus to whatever opened it.
     ========================================================================== */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let activeDialog = null;

  function trapFocus(event) {
    if (!activeDialog || event.key !== 'Tab') return;
    const focusable = [...activeDialog.element.querySelectorAll(FOCUSABLE)]
      .filter(el => el.offsetParent !== null || el === document.activeElement);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const dialog = {
    /**
     * @param {HTMLElement} element   the dialog root
     * @param {HTMLElement} [initialFocus] element to focus once open
     */
    open(element, initialFocus) {
      activeDialog = { element, returnTo: document.activeElement };
      // Compensate for the scrollbar so the page does not shift sideways.
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
      document.addEventListener('keydown', trapFocus);
      (initialFocus || element.querySelector(FOCUSABLE))?.focus({ preventScroll: true });
    },
    close() {
      if (!activeDialog) return;
      const { returnTo } = activeDialog;
      activeDialog = null;
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.removeEventListener('keydown', trapFocus);
      if (returnTo && typeof returnTo.focus === 'function') returnTo.focus({ preventScroll: true });
    }
  };

  window.RTWC = { dialog, reducedMotion };

  document.addEventListener('DOMContentLoaded', () => {
    /* ========================================================================
       1. FOOTER COPYRIGHT YEAR
       ======================================================================== */
    const yearElement = document.getElementById('current-year');
    if (yearElement) yearElement.textContent = new Date().getFullYear();

    /* ========================================================================
       2. MOBILE NAVIGATION
       The hamburger ↔ close morph is pure CSS driven by aria-expanded.
       ======================================================================== */
    const navToggleBtn = document.getElementById('mobile-nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggleBtn && navMenu) {
      const backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);

      const isOpen = () => navMenu.classList.contains('open');

      const setMenuOpen = (open, { returnFocus = false } = {}) => {
        navMenu.classList.toggle('open', open);
        backdrop.classList.toggle('is-visible', open);
        navToggleBtn.setAttribute('aria-expanded', String(open));
        navToggleBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        if (!open && returnFocus) navToggleBtn.focus();
      };

      navToggleBtn.setAttribute('aria-label', 'Open navigation menu');
      navToggleBtn.addEventListener('click', () => setMenuOpen(!isOpen()));
      backdrop.addEventListener('click', () => setMenuOpen(false));

      // Choosing a destination closes the menu (matters for same-page anchors).
      navMenu.addEventListener('click', event => {
        if (event.target.closest('a')) setMenuOpen(false);
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isOpen()) setMenuOpen(false, { returnFocus: true });
      });

      // Tabbing out of the open menu closes it instead of leaving it covering the page.
      navMenu.addEventListener('focusout', event => {
        if (!isOpen()) return;
        const next = event.relatedTarget;
        if (next && !navMenu.contains(next) && next !== navToggleBtn) setMenuOpen(false);
      });

      // Returning to the desktop layout must never leave a stale open state behind.
      const desktopLayout = window.matchMedia('(min-width: 1101px)');
      desktopLayout.addEventListener('change', event => {
        if (event.matches) setMenuOpen(false);
      });
    }

    /* ========================================================================
       3. HEADER SCROLL EFFECT
       ======================================================================== */
    const siteHeader = document.querySelector('.site-header');
    if (siteHeader) {
      let ticking = false;
      const updateHeader = () => {
        siteHeader.classList.toggle('scrolled', window.scrollY > 30);
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateHeader);
        }
      }, { passive: true });
      updateHeader();
    }

    /* ========================================================================
       4. HIGHLIGHT ACTIVE PAGE LINK
       ======================================================================== */
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const isCurrent = link.getAttribute('href') === currentPath;
      link.classList.toggle('active', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    /* ========================================================================
       5. SCROLL REVEAL
       Static sections ease in the first time they scroll into view. Only
       elements that start below the fold are touched, so nothing visible on
       load is ever hidden, and the classes are removed afterwards so they
       cannot interfere with hover states.
       ======================================================================== */
    const REVEAL_SELECTOR = [
      '.section-header', '.events-section-header',
      '.welcome-image-wrapper', '.welcome-text', '.quicklink-card',
      '.sermon-player-container', '.sermon-info-box', '.visit-card', '.map-card',
      '.about-history-text', '.about-history-image', '.mv-card', '.accordion-item',
      '.pastor-featured-card', '.affiliation-box',
      '.ministry-card', '.cta-banner',
      '.info-card', '.form-card', '.map-embed-card',
      '.calendar-note-box', '.filter-bar-card',
      '.footer-grid > *'
    ].join(',');
    const ARC_SELECTOR = '.welcome-image-wrapper, .about-history-image, .sermon-player-container';

    if ('IntersectionObserver' in window && !reducedMotion.matches) {
      const viewportHeight = window.innerHeight;
      const targets = [...document.querySelectorAll(REVEAL_SELECTOR)]
        .filter(el => el.getBoundingClientRect().top > viewportHeight);

      const finish = el => {
        el.classList.remove('reveal', 'reveal--arc', 'is-visible');
        el.style.removeProperty('--reveal-delay');
      };

      const observer = new IntersectionObserver((entries, obs) => {
        // Elements that arrive together are staggered left-to-right, top-to-bottom.
        entries
          .filter(entry => entry.isIntersecting)
          .forEach((entry, index) => {
            const el = entry.target;
            const delay = Math.min(index, 4) * 70;
            el.style.setProperty('--reveal-delay', `${delay}ms`);
            el.classList.add('is-visible');
            obs.unobserve(el);
            setTimeout(() => finish(el), 700 + delay);
          });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

      targets.forEach(el => {
        el.classList.add('reveal');
        if (el.matches(ARC_SELECTOR)) el.classList.add('reveal--arc');
        observer.observe(el);
      });

      // If the preference changes mid-visit, show everything immediately.
      reducedMotion.addEventListener('change', event => {
        if (event.matches) {
          observer.disconnect();
          document.querySelectorAll('.reveal').forEach(finish);
        }
      });
    }
  });
})();
