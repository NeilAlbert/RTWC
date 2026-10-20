/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Shared Footer Module (js/footer.js)
 * Renders identical footer markup into <footer id="site-footer"> on every page
 */

// Footer data - church information and social links
const footerData = {
  churchName: 'Royal Temple Worship Centre',
  tagline: 'The Church of Pentecost',
  description: 'A glorious assembly dedicated to holy living, vibrant worship, and global evangelism under God\'s grace.',
  
  serviceTimes: [
    { name: 'Sunday Divine Service', time: '8:00 AM – 11:30 AM' },
    { name: 'Wednesday Midweek Service', time: '6:30 PM – 8:30 PM' },
    { name: 'Friday Prayer Tower', time: '6:30 PM – 9:00 PM' }
  ],
  
  contact: {
    address: 'Royal Temple Worship Centre,\nThe Church of Pentecost.',
    phone: '+233 (0) 30 123 4567',
    email: 'info@royaltemple.org'
  },
  
  // Social links - only include platforms with real URLs
  // Commented-out examples show where other platforms would go
  socials: [
    { name: 'Facebook', url: 'https://www.facebook.com/cop.rtwc', aria: 'Royal Temple Worship Centre on Facebook', icon: 'facebook' },
    // { name: 'YouTube', url: 'https://www.youtube.com/c/RoyalTempleWC', aria: 'Royal Temple Worship Centre on YouTube', icon: 'youtube' }, // commented out - no real URL
    // { name: 'X', url: 'https://x.com/royaltemplewc', aria: 'Royal Temple Worship Centre on X', icon: 'x' }, // commented out - no real URL
    // { name: 'WhatsApp', url: 'https://wa.me/233301234567', aria: 'Royal Temple Worship Centre on WhatsApp', icon: 'whatsapp' }, // commented out - no real URL
    { name: 'Instagram', url: 'https://www.instagram.com/royaltemple_wc', aria: 'Royal Temple Worship Centre on Instagram', icon: 'instagram' }
  ]
};

// Attribution data
const attributionData = {
  icons8Link: 'https://icons8.com',
  icons8Text: 'Icons by Icons8'
};

/**
 * Render the footer HTML and insert it into the page
 */
function renderFooter() {
  const footerContainer = document.getElementById('site-footer');
  if (!footerContainer) {
    console.warn('Footer container <footer id="site-footer"> not found in page');
    return;
  }
  
  // Build the footer HTML
  const html = buildFooterHTML();
  footerContainer.innerHTML = html;
  
  // Add event listeners for social icon hover/focus
  initFooterInteractions();
}/**
 * Build the complete footer HTML string
 */
function buildFooterHTML() {  const year = new Date().getFullYear();
  
  // Build social links HTML  const socialsHTML = footerData.socials.map((social, index) => {    const iconFile = getIconFile(social.icon);
    const isExternal = social.url.startsWith('http');
    const targetBlank = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
    
    return `      <a href="${social.url}" class="social-icon-btn" ${targetBlank} aria-label="${social.aria}">        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <use href="#icon-${social.icon}"></use>        </svg>      </a>`;  }).join('\n');
  
  // Build contact info HTML  const contactHTML = `    <div class="contact-row">      <span class="contact-icon">        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">          <use href="#icon-location"></use>        </svg>      </span>      <span class="contact-text">${footerData.contact.address}</span>    </div>    <div class="contact-row">      <span class="contact-icon">        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">          <use href="#icon-phone"></use>        </svg>      </span>      <span class="contact-text">${footerData.contact.phone}</span>    </div>    <div class="contact-row">      <span class="contact-icon">        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">          <use href="#icon-email"></use>        </svg>      </span>      <span class="contact-text">${footerData.contact.email}</span>    </div>`;
  
  // Build service times HTML  const servicesHTML = footerData.serviceTimes.map((service, index) => {    return `        <div class="service-time-item">          <span class="service-time-name">${service.name}</span>          <span class="service-time-clock">${service.time}</span>        </div>`;  }).join('\n');
  
  const footerHTML = `    <footer id="site-footer" class="site-footer" role="contentinfo">      <div class="container">        <div class="footer-grid">          <!-- Column 1: Brand Info -->          <div class="footer-col footer-col-brand">            <div class="footer-logo">              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">                <use href="#icon-facebook"></use>              </svg>            </div>            <h3>${footerData.churchName}</h3>            <div class="tagline">${footerData.tagline}</div>            <p>${footerData.description}</p>          </div>          
          <!-- Column 2: Service Times -->          <div class="footer-col">            <h4 class="footer-h4">Service Times</h4>            ${servicesHTML}          </div>          
          <!-- Column 3: Contact -->          <div class="footer-col">            <h4 class="footer-h4">Contact</h4>            ${contactHTML}          </div>        </div>      </div>      
      <!-- Footer Bottom Bar -->      <div class="footer-bottom">        <div class="container footer-bottom-content">          <!-- Social Icons -->          <div class="social-icons">            ${socialsHTML}          </div>          
          <!-- Copyright & Attribution -->          <div class="copyright-bar"> &copy; <span id="footer-current-year">${year}</span> Royal Temple Worship Centre — The Church of Pentecost. All Rights Reserved.            <a href="${attributionData.icons8Link}" target="_blank" rel="noopener noreferrer" class="icons8-attribution" style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">Icons by Icons8</a>          </div>        </div>      </div>    </footer>`;  return footerHTML;}/**
 * Get the SVG file path for a given icon name */function getIconFile(iconName) {  const iconMap = {    facebook: 'assets/icons/facebook.svg',    phone: 'assets/icons/phone.svg',    email: 'assets/icons/email.svg',    location: 'assets/icons/location.svg',    clock: 'assets/icons/clock.svg'  };  return (iconMap[iconName] || 'assets/icons/facebook.svg');}/**
 * Initialize footer interaction event listeners */function initFooterInteractions() {  // Social icon hover/focus: reduce opacity to 0.8 and show gold outline  const socialBtns = document.querySelectorAll('.social-icon-btn');  socialBtns.forEach(btn => {    btn.addEventListener('mouseover', () => {      btn.style.opacity = '0.8';      btn.style.borderBottom = '1px solid var(--accent-gold)';    });    btn.addEventListener('mouseout', () => {      btn.style.opacity = '';      btn.style.borderBottom = '';    });    btn.addEventListener('focus', () => {      btn.style.opacity = '0.8';      btn.style.borderBottom = '1px solid var(--accent-gold)';      btn.style.outline = 'none';    });    btn.addEventListener('blur', () => {      btn.style.opacity '';      btn.style.borderBottom = '';      btn.style.outline = '';    });  });}

// Initialize footer on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
});