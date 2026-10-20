// THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
// Contact & Prayer Request Page Specific JavaScript (js/pages/contact.js)
// Connects to /api/contact and /api/prayer-requests backend endpoints.

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     1. GENERAL CONTACT FORM
     ========================================================================== */
  const contactForm = document.getElementById('contact-form');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('contact-subject');
  const messageInput = document.getElementById('contact-message');
  const errName = document.getElementById('err-name');
  const errEmail = document.getElementById('err-email');
  const errMessage = document.getElementById('err-message');
  const contactSuccessMsg = document.getElementById('contact-success-msg');

  /* ==========================================================================
     PRAYER REQUEST FORM
     ========================================================================== */
  const prayerForm = document.getElementById('prayer-form');
  const prayerInput = document.getElementById('prayer-request');
  const errPrayer = document.getElementById('err-prayer');
  const prayerSuccessMsg = document.getElementById('prayer-success-msg');

  const API_BASE = '';

  /* ==========================================================================
     GENERAL CONTACT FORM HANDLER
     ========================================================================== */
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
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
        try {
          const response = await fetch(`${API_BASE}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameInput.value.trim(),
              email: emailInput.value.trim(),
              subject: subjectInput?.value.trim() || '',
              message: messageInput.value.trim()
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to send message');
          }

          contactForm.reset();
          contactSuccessMsg.textContent = "Thank you — your message has been received.";
          contactSuccessMsg.style.display = 'block';

          // Hide success message after 8 seconds
          setTimeout(() => {
            contactSuccessMsg.style.display = 'none';
          }, 8000);
        } catch (err) {
          showContactError(err.message || 'Something went wrong. Please try again.');
        }
      }
    });
  }

  /* ==========================================================================
     PRAYER REQUEST FORM HANDLER
     ========================================================================== */
  if (prayerForm) {
    prayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errPrayer.textContent = '';

      if (!prayerInput.value.trim()) {
        errPrayer.textContent = 'Please describe your prayer request.';
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/prayer-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prayerForm.querySelector('input[name="name"]').value.trim(),
            request_text: prayerInput.value.trim(),
            is_anonymous: document.getElementById('prayer-anonymous')?.checked || false
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to submit prayer request');
        }

        prayerForm.reset();
        prayerSuccessMsg.textContent = "Thank you — your prayer request has been received.";
        prayerSuccessMsg.style.display = 'block';

        setTimeout(() => {
          prayerSuccessMsg.style.display = 'none';
        }, 8000);
      } catch (err) {
        showPrayerError(err.message || 'Something went wrong. Please try again.');
      }
    });
  }

  /* ==========================================================================
     ERROR HELPERS
     ========================================================================== */
  function showContactError(message) {
    const errorBox = document.getElementById('contact-form-error');
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function showPrayerError(message) {
    const errorBox = document.getElementById('prayer-form-error');
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }
});
