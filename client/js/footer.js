/**
 * ROYAL TEMPLE WORSHIP CENTRE - Footer Script
 * Rendered into <footer id="site-footer"> on every public page.
 * Navy background, white text, gold headings and divider.
 * Desktop: four columns. Tablet: two columns. Mobile: one column.
 * Bottom bar: social icons (Facebook left), JS-generated year,
 * "Icons by Icons8" link, and link to thecophq.org.
 * Settings values come from /api/settings (contact, service times).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Generate JS copyright year
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // 2. Fill footer settings from API if available
  // This runs after main.js has loaded settings
  const settingElements = document.querySelectorAll('[data-setting]');
  // Settings are already filled by main.js, but we can re-apply here for footer-specific elements
  
  // 3. Initialize footer mobile behavior if needed
  const footerLinks = document.querySelectorAll('.footer-column a');
  footerLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Close mobile nav if open
      const navMenu = document.querySelector('.nav-menu.mobile-open');
      if (navMenu) {
        navMenu.classList.remove('open');
        const toggle = document.querySelector('.mobile-nav-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  // 4. Focus visible states for footer links
  footerLinks.forEach(link => {
    link.addEventListener('focus-visible', () => {
      link.style.outline = '2px solid var(--gold)';
      link.style.outlineOffset = '2px';
    });
    
    link.addEventListener('blur', () => {
      link.style.outline = '';
      link.style.outlineOffset = '';
    });
  });
});