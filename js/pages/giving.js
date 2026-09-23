/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Online Giving Page Specific JavaScript (js/pages/giving.js)
 *
 * Flow: the donor fills the form -> we POST to /api/giving/initiate ->
 * the backend creates a pending giving_records row and initializes a Paystack
 * transaction -> we redirect the donor's browser to Paystack's hosted checkout
 * (authorization_url). After payment, Paystack redirects back to
 * giving-callback.html, which calls GET /api/giving/verify/:reference.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Base URL for the API. Empty string = same origin. Change this if the API
  // is hosted on a different domain (e.g. 'https://api.royaltemple.org').
  const API_BASE = '';

  const form = document.getElementById('giving-form');
  const customAmountInput = document.getElementById('custom-amount');
  const presetBtns = document.querySelectorAll('.btn-preset');
  const submitBtn = document.getElementById('giving-submit-btn');
  const submitLabel = submitBtn ? submitBtn.querySelector('.btn-giving-label') : null;
  const errorBox = document.getElementById('giving-form-error');

  const categorySelect = document.getElementById('giving-category');
  const nameInput = document.getElementById('giver-name');
  const emailInput = document.getElementById('giver-email');

  // Preset Amount Button Handlers
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.getAttribute('data-amount');
      if (customAmountInput) {
        customAmountInput.value = val;
        hideError();
      }
    });
  });

  // Clear preset active state when user manually types custom amount
  if (customAmountInput) {
    customAmountInput.addEventListener('input', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      hideError();
    });
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (submitLabel) {
      submitLabel.textContent = isLoading ? 'Redirecting to secure payment…' : 'Proceed to Secure Payment';
    }
  }

  // Form Submission Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const category = categorySelect ? categorySelect.value : '';
      const amount = Number(customAmountInput ? customAmountInput.value : 0);

      // Client-side checks (the server validates again).
      if (name.length < 2) {
        showError('Please enter your full name.');
        nameInput && nameInput.focus();
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        emailInput && emailInput.focus();
        return;
      }
      if (!category) {
        showError('Please select a giving category.');
        categorySelect && categorySelect.focus();
        return;
      }
      if (!Number.isFinite(amount) || amount < 1) {
        showError('Please enter an amount of at least GH₵ 1.');
        customAmountInput && customAmountInput.focus();
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/giving/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, amount, category }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Something went wrong. Please try again.');
        }

        // Redirect the donor to Paystack's secure hosted checkout.
        if (data.data && data.data.authorizationUrl) {
          window.location.href = data.data.authorizationUrl;
          return; // page will navigate away
        }
        throw new Error('The payment link could not be created. Please try again.');
      } catch (err) {
        setLoading(false);
        showError(err.message || 'Something went wrong. Please try again.');
      }
    });
  }
});
