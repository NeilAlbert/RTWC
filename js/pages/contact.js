// BACKEND REMOVED — see contact form and prayer request previously called /api/contact and /api/prayer-requests. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Contact & Prayer Request Page Specific JavaScript (js/pages/contact.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. General Contact Form Client-Side Validation & Handler
  const contactForm = document.getElementById('contact-form');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const messageInput = document.getElementById('contact-message');

  const errName = document.getElementById('err-name');
  const errEmail = document.getElementById('err-email');
  const errMessage = document.getElementById('err-message');
  const contactSuccessMsg = document.getElementById('contact-success-msg');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let isValid = true;

      // Clear existing errors
      errName.textContent = '';
      errEmail.textContent = '';
      errMessage.textContent = '';

      // Validate Name
      if (!nameInput.value.trim()) {
        errName.textContent = 'Please enter your full name.';
        isValid = false;
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim()) {
        errEmail.textContent = 'Please enter your email address.';
        isValid = false;
      } else if (!emailRegex.test(emailInput.value.trim())) {
        errEmail.textContent = 'Please enter a valid email address.';
        isValid = false;
      }

      // Validate Message
      if (!messageInput.value.trim()) {
        errMessage.textContent = 'Please enter your message.';
        isValid = false;
      }

      if (isValid) {
        /* 
          BACKEND REMOVED NOTE:
          This form currently displays an on-page confirmation message.
          Reconnect to a real backend API (e.g. POST /api/contact) or a form service (e.g. Formspree) later.
        */
        contactForm.reset();
        contactSuccessMsg.textContent = "Thank you, we'll be in touch.";
        contactSuccessMsg.style.display = 'block';
        setTimeout(() => {
          contactSuccessMsg.style.display = 'none';
        }, 8000);
      }
    });
  }

  // 2. Prayer Request Form Handler
  const prayerForm = document.getElementById('prayer-form');
  const prayerInput = document.getElementById('prayer-request');
  const errPrayer = document.getElementById('err-prayer');
  const prayerSuccessMsg = document.getElementById('prayer-success-msg');

  if (prayerForm) {
    prayerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      errPrayer.textContent = '';

      if (!prayerInput.value.trim()) {
        errPrayer.textContent = 'Please describe your prayer request.';
        return;
      }

      /* 
        BACKEND REMOVED NOTE:
        This form currently displays an on-page confirmation message.
        Reconnect to a real backend API (e.g. POST /api/prayer-requests) or a form service (e.g. Formspree) later.
      */
      prayerForm.reset();
      prayerSuccessMsg.textContent = "Thank you, we'll be in touch.";
      prayerSuccessMsg.style.display = 'block';
      setTimeout(() => {
        prayerSuccessMsg.style.display = 'none';
      }, 8000);
    });
  }
});
