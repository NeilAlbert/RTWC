/**
 * ROYAL TEMPLE WORSHIP CENTRE - SHARED FOOTER MODULE
 * Renders identical footer markup into <footer id="site-footer"> on every page
 * vanilla JS, no dependencies, no icon libraries, no CDNs
 * Icons sourced from /assets/icons/ (icons8.com, consistent style, colored white)
 */

// =============================================================================
// CONFIGURATION — single source of truth for all editable footer data
// =============================================================================

const footerConfig = {
  // Church description — edit this one line
  description:
    'A glorious assembly dedicated to holy living, vibrant worship, and global evangelism under God\'s grace.',

  // Service times — edit these values; one object, one place to change them
  serviceTimes: [
    { name: 'Sunday Divine Service', time: '8:00 AM – 11:30 AM' },
    { name: 'Wednesday Midweek Service', time: '6:30 PM – 8:30 PM' },
    { name: 'Friday Prayer Tower', time: '6:30 PM – 9:00 PM' }
  ],

  // Contact information — edit these values; one object, one place to change them
  contact: {
    address: 'Royal Temple Worship Centre,\nThe Church of Pentecost.',
    phone: '+233 (0) 30 123 4567',
    email: 'info@royaltemple.org'
  },

  // Social links — only include platforms with real URLs
  // Facebook has a real URL; other platforms commented out until real URLs are available
  socials: [
    { name: 'Facebook', url: 'https://www.facebook.com/cop.rtwc', icon: 'facebook', aria: 'Royal Temple Worship Centre on Facebook' }
    // { name: 'YouTube', url: '', icon: 'youtube', aria: '' }, // real URL needed
    // { name: 'X', url: '', icon: 'x', aria: '' }, // real URL needed
    // { name: 'Instagram', url: '', icon: 'instagram', aria: '' }, // real URL needed
    // { name: 'WhatsApp', url: '', icon: 'whatsapp', aria: '' } // real URL needed
  ],

  // Icons8 attribution (required by free license)
  icons8: {
    name: 'Icons by Icons8',
    url: 'https://icons8.com',
    openNewTab: true
  }
}

// =============================================================================
// ICON PATH MAP — maps icon names to their file paths in /assets/icons/
// =============================================================================

const iconMap = {
  facebook: 'assets/icons/facebook.svg',
  phone: 'assets/icons/phone.png',
  email: 'assets/icons/email.png',
  location: 'assets/icons/location.png',
  clock: 'assets/icons/clock.svg',
  instagram: 'assets/icons/instagram.svg'
};

// =============================================================================
// TEMPLATE LITERAL — builds the complete footer HTML string
// =============================================================================

function buildFooterHTML() {
  const year = new Date().getFullYear();

  // --- Column 1: About ---
  const aboutColumn = `
    <div class="footer-col about-col">
      <h3>Royal Temple Worship Centre</h3>
      <div class="sub-tagline">The Church of Pentecost</div>
      <p>${footerConfig.description}</p>
    </div>`;

  // --- Column 2: Quick Links ---
  const quickLinksColumn = `
    <div class="footer-col quick-links-col">
      <h4>Quick Links</h4>
      <ul class="footer-link-list">
        ${['Home', 'About', 'Ministries', 'Sermons', 'Events', 'Live', 'Gallery', 'Giving', 'Contact']
          .map(
            (link) => `<li><a href="${link.toLowerCase().replace(/\s+/g, '-')}.html">${link}</a></li>`
          )
          .join('\n')}</ul>`;

  // --- Column 3: Service Times ---
  const serviceTimesColumn = `
    <div class="footer-col service-times-col">
      <h4>Service Times</h4>
      ${footerConfig.serviceTimes
        .map(
          (st) => `<div class="service-item"><span class="service-day">${st.name.split(' ')[0]}</span><span class="service-time">${st.time}</span></div>`
        )
        .join('\n')}</div>`;

  // --- Column 4: Contact ---
  const contactColumn = `
    <div class="footer-col contact-col">
      <h4>Contact</h4>
      <div class="contact-info">
        <div class="contact-row">
          <img src="${iconMap.location}" alt="Location icon" class="contact-icon">
          <span class="contact-address">${footerConfig.contact.address}</span>
        </div>
        <div class="contact-row">
          <img src="${iconMap.phone}" alt="Phone icon" class="contact-icon">
          <a href="tel:${footerConfig.contact.phone}" class="contact-phone">${footerConfig.contact.phone}</a>
        </div>
        <div class="contact-row">
          <img src="${iconMap.email}" alt="Email icon" class="contact-icon">
          <a href="mailto:${footerConfig.contact.email}" class="contact-email">${footerConfig.contact.email}</a>
        </div>
      </div>`;

  // --- Social icons (bottom bar) ---
  const socialIconsHTML = footerConfig.socials
    .map(
      (social) => `
      <a href="${social.url}" class="social-icon" target="_blank" rel="noopener noreferrer" aria-label="${social.aria}">
        <img src="${iconMap[social.icon]}" alt="${social.name} icon" width="24" height="24">
      </a>`
    )
    .join('\n');

  // --- Copyright & Icons8 attribution ---
  const icons8Link = footerConfig.icons8.url;
  const icons8Text = footerConfig.icons8.name;
  const icons8Target = footerConfig.icons8.openNewTab ? 'target="_blank" rel="noopener noreferrer"' : '';

  const copyrightHTML = `
    <div class="copyright-bar">
      &copy; <span id="footer-current-year">${year}</span> Royal Temple Worship Centre — The Church of Pentecost. All Rights Reserved.
      <a href="${icons8Link}" ${icons8Target} style="color: rgba(255,255,255,0.7); font-size: 0.75rem; text-decoration: none;">
        ${icons8Text}
      </a>
    </div>`;

  // --- Full footer markup ---
  const footerHTML = `
    <footer id="site-footer" class="site-footer" role="contentinfo">
      <div class="footer-container">
        <div class="footer-grid">
          ${aboutColumn}
          ${quickLinksColumn}
          ${serviceTimesColumn}
          ${contactColumn}
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-bottom-inner">
          <div class="social-icons-left">
            ${socialIconsHTML}
          </div>
          ${copyrightHTML}
        </div>
      </div>
    </footer>`;

  return footerHTML;
}

// =============================================================================
// RENDERER — inserts the footer into the page
// =============================================================================

function renderFooter() {
  const container = document.getElementById('site-footer');
  if (!container) {
    console.warn('Footer container <footer id="site-footer"> not found in page');
    return;
  }

  container.innerHTML = buildFooterHTML();

  // Initialize focus-visible styles for social icons
  initSocialIconFocus();
}

// =============================================================================
// SOCIAL ICON FOCUS INITIALIZATION
// =============================================================================

function initSocialIconFocus() {
  const socialIcons = document.querySelectorAll('.social-icon');
  socialIcons.forEach((icon) => {
    icon.addEventListener('mouseover', () => {
      icon.style.opacity = '0.8';
      icon.style.outline = '1px solid var(--accent-gold)';
      icon.style.outlineOffset = '2px';
    });

    icon.addEventListener('mouseout', () => {
      icon.style.opacity '';
      icon.style.outline '';
      icon.style.outlineOffset '';
    });

    icon.addEventListener('focus', () => {
      icon.style.opacity = '0.8';
      icon.style.outline = '1px solid var(--accent-gold)';
      icon.style.outlineOffset = '2px';
      icon.style.background 'none';
    });

    icon.addEventListener('blur', () => {
      icon.style.opacity '';
      icon.style.outline '';
      icon.style.outlineOffset '';
    });
  });
}

// =============================================================================
// AUTO-INITIALIZATION — run when DOM is ready
// =============================================================================

if (typeof window !== 'undefined') {
  doc
