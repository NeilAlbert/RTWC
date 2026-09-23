/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Shared JavaScript (js/main.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Footer Copyright Year
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // 2. Mobile Navigation Toggle
  const navToggleBtn = document.getElementById('mobile-nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggleBtn && navMenu) {
    navToggleBtn.addEventListener('click', () => {
      const isExpanded = navToggleBtn.getAttribute('aria-expanded') === 'true';
      navToggleBtn.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('open');
      
      // Update hamburger SVG state
      const svgIcon = navToggleBtn.querySelector('svg');
      if (!isExpanded) {
        // Change to close X icon
        svgIcon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
      } else {
        // Change back to hamburger
        svgIcon.innerHTML = '<line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line>';
      }
    });

    // Close menu when clicking outside or pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
        navToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 3. Header Scroll Effect
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    });
  }

  // 4. Highlight Active Page Link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
});
