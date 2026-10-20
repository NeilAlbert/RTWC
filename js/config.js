// =============================================================================
// ROYAL TEMPLE WORSHIP CENTRE - CONFIGURATION
// Single source of truth for all editable site information
// =============================================================================

// Church Core Identity
export const churchName = 'Royal Temple Worship Centre';
export const tagline = 'The Church of Pentecost';
export const description = 'A glorious assembly dedicated to holy living, vibrant worship, and global evangelism under God\'s grace.';

// Contact Information (edit these values; one place to change them)
export const contact = {
  address: 'Royal Temple Worship Centre Complex,\nMain District Headquarters Road,\nAccra, Ghana.',
  phone: '+233 (0) 30 123 4567',
  email: 'info@royaltemple.org'
};

// Service Times (edit these values; one object, one place to change them)
export const serviceTimes = [
  { name: 'Sunday Divine Service', time: '8:00 AM – 11:30 AM' },
  { name: 'Wednesday Midweek Service', time: '6:30 PM – 8:30 PM' },
  { name: 'Friday Prayer Tower', time: '6:30 PM – 9:00 PM' }
};

// Social Links - only include platforms with real URLs
// Facebook has a real URL; other platforms commented out until real URLs are available
export const socials = [
  { 
    name: 'Facebook', 
    url: 'https://www.facebook.com/cop.rtwc', 
    aria: 'Royal Temple Worship Centre on Facebook',
    icon: 'facebook' // references /assets/icons/facebook.svg
    // { name: 'YouTube', url: '', icon: 'youtube' }, // real URL needed
    // { name: 'X', url: '', icon: 'x' }, // real URL needed
    // { name: 'Instagram', url: '', icon: 'instagram' }, // real URL needed
    // { name: 'WhatsApp', url: '', icon: 'whatsapp' } // real URL needed
  }
];

// National Site
export const copHQ = {
  url: 'https://thecophq.org',
  label: 'The Church of Pentecost International'
};

// Google Maps Placeholder
export const googleMaps = {
  placeholder: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.0785581686046!2d-0.021474725175214097!3d5.701790394280024!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf81a63586dffd%3A0xfcf2e597e3ca059b!2sThe%20Church%20of%20Pentecost%20(Royal%20Temple%20Worship%20Center)!5e0!3m2!1sen!2sgh',
  note: 'Replace with real Google Maps embed code'
};

// Church Established (year - edit this)
export const establishedYear = 2026;

// Ministry Names (for consistent use across pages)
export const ministries = [
  'Men\'s Ministry',
  'Women\'s Ministry', 
  'Pentecost Youth Fellowship (PYFM)',
  'PENSA',
  'Children\'s Ministry',
  'Choir',
  'Evangelism and Missions',
  'Ushering Board',
  'Prayer Force'
];

// Default Image Placeholders
export const placeholders = {
  logo: 'assets/images/logo-placeholder.svg',
  hero: 'assets/images/hero-placeholder.jpg',
  pastor: 'assets/images/pastor-placeholder.svg'
};

// SEO Config (edit per page)
export const seo = {
  defaultTitle: 'Royal Temple Worship Centre - The Church of Pentecost',
  defaultDescription: 'A vibrant house of prayer, worship, and spiritual growth where lives are transformed by the power of Christ.',
  defaultImage: 'assets/images/hero-placeholder.jpg'
};
