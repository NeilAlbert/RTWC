/**
 * ROYAL TEMPLE WORSHIP CENTRE - Main Client Script
 * nav toggle, active link, loads /api/settings once per page and fills
 * any element with a data-setting="key" attribute.
 * Every data-driven section shows a simple "Loading..." state, and a clear
 * friendly error message if the request fails, and an empty-state message
 * if there is no data.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Skip link focus management
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    skipLink.addEventListener('focus', () => {
      skipLink.style.left = '0';
      skipLink.style.top = '0';
      skipLink.style.width = 'auto';
      skipLink.style.height = 'auto';
      skipLink.style.padding = '8px 16px';
      skipLink.style.background = 'var(--navy)';
      skipLink.style.color = 'var(--white)';
      skipLink.style.zIndex = '9999';
    });
  }

  // 2. Mobile Navigation Toggle
  const navToggle = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.contains('open');
      
      if (isOpen) {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      } else {
        navMenu.classList.add('open');
        navToggle.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // 3. Close mobile menu when clicking a nav link
  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const navMenu = link.closest('.nav-menu');
      if (navMenu && navMenu.classList.contains('mobile-open')) {
        navMenu.classList.remove('open');
        const toggle = document.querySelector('.mobile-nav-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  // 4. Active Page Link Highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // 5. Load Settings and Fill data-setting Elements
  // Only load once per page - store in localStorage per session
  const SETTINGS_CACHE_KEY = 'royal_temple_settings_cache';
  const cacheExpiry = localStorage.getItem(`${SETTINGS_CACHE_KEY}_expiry`);
  const now = Date.now();
  
  let settings = null;
  
  // Check if we have fresh cache (within 5 minutes)
  if (cacheExpiry && now < parseInt(cacheExpiry)) {
    try {
      settings = JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY));
    } catch (e) {
      // Cache corrupt, re-fetch
    }
  }

  // Fetch settings if not in cache
  if (!settings) {
    fetch('/api/settings')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(result => {
        if (result.ok && result.data) {
          settings = result.data;
          // Cache for 5 minutes
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
          localStorage.setItem(`${SETTINGS_CACHE_KEY}_expiry`, String(Date.now() + 300000));
        }
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
      });
  }

  // If we have settings, fill elements with data-setting attributes
  if (settings) {
    // Collect all unique keys that appear on this page
    const settingElements = document.querySelectorAll('[data-setting]');
    
    settingElements.forEach(el => {
      const key = el.getAttribute('data-setting');
      if (settings[key] !== undefined && settings[key] !== null) {
        // If the element has a specific format attribute, use it
        if (el.tagName === 'INPUT' && el.type === 'email') {
          el.value = settings[key];
        } else if (el.tagName === 'INPUT' && el.type === 'tel') {
          el.value = settings[key];
        } else if (el.tagName === 'TEXTAREA') {
          el.value = settings[key];
        } else {
          el.textContent = settings[key];
        }
      } else {
        // Empty state - show placeholder or hide
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = escapeHTML(settings[key] || '');
        } else {
          el.textContent = escapeHTML(settings[key] || '');
        }
      }
    });
  }

  // 6. Loading state handling for API-dependent sections
  // This will be enhanced per page in page-specific scripts
  document.querySelectorAll('.api-loading').forEach(el => {
    // These elements will be managed by page scripts
    el.style.display = 'none';
  });
});