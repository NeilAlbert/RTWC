/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Payment Callback Page JavaScript (js/pages/giving-callback.js)
 *
 * Paystack redirects the donor's browser here after payment with the
 * transaction reference in the query string (?reference=...). We call
 * GET /api/giving/verify/:reference to confirm the payment status and show a
 * clear success / pending / failed message.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Base URL for the API. Empty string = same origin. Change this if the API
  // is hosted on a different domain (e.g. 'https://api.royaltemple.org').
  const API_BASE = '';

  const params = new URLSearchParams(window.location.search);
  // Paystack appends both `reference` and `trxref`; prefer `reference`.
  const reference = params.get('reference') || params.get('trxref') || '';

  const statusCard = document.getElementById('status-card');

  function render(html) {
    if (statusCard) statusCard.innerHTML = html;
  }

  // Defense in depth: references are server-generated, but never inject raw
  // URL data into the DOM (a crafted ?reference= link must stay inert).
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showError(message) {
    render(`
      <div class="status-icon status-icon-failed" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </div>
      <h1 class="status-title">We couldn't verify your payment</h1>
      <p class="status-text">${message}</p>
      <p class="status-text status-ref">If you were charged, your receipt is on its way and our records are safe — this page just couldn't confirm it right now.</p>
      <div class="status-actions">
        <a href="giving.html" class="btn btn-primary">Return to Giving</a>
        <a href="index.html" class="btn btn-outline-gold">Back to Home</a>
      </div>
    `);
  }

  if (!reference) {
    showError('No payment reference was found in the link you followed.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/giving/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'We could not confirm your payment status right now.');
    }

    const status = data.data && data.data.status;
    renderStatus(status, reference);
  } catch (err) {
    showError(err.message || 'We could not confirm your payment status right now.');
  }

  function renderStatus(status, ref) {
    const safeRef = escapeHtml(ref);
    if (status === 'completed') {
      render(`
        <div class="status-icon status-icon-success" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1 class="status-title">Thank you for your gift!</h1>
        <p class="status-text">Your payment was successful. We are deeply grateful for your generosity — it supports worship, ministry, and missions at Royal Temple Worship Centre.</p>
        <p class="status-text status-ref">Reference: <strong>${safeRef}</strong></p>
        <p class="status-text">A confirmation email has been sent to you.</p>
        <div class="status-actions">
          <a href="index.html" class="btn btn-primary">Back to Home</a>
          <a href="giving.html" class="btn btn-outline-gold">Give Again</a>
        </div>
      `);
    } else if (status === 'pending') {
      render(`
        <div class="status-icon status-icon-pending" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <h1 class="status-title">Payment still being confirmed</h1>
        <p class="status-text">We've received your payment request and it is still being confirmed by the payment provider. This can take a few minutes.</p>
        <p class="status-text status-ref">Reference: <strong>${safeRef}</strong></p>
        <p class="status-text">You don't need to do anything — we'll confirm it automatically. You'll also receive a confirmation email.</p>
        <div class="status-actions">
          <a href="giving.html" class="btn btn-primary">Return to Giving</a>
          <a href="index.html" class="btn btn-outline-gold">Back to Home</a>
        </div>
      `);
    } else {
      render(`
        <div class="status-icon status-icon-failed" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
        <h1 class="status-title">Payment not completed</h1>
        <p class="status-text">Your payment was not completed. If you believe this is a mistake, please try again or use our Bank Transfer / Mobile Money details on the giving page.</p>
        <p class="status-text status-ref">Reference: <strong>${safeRef}</strong></p>
        <div class="status-actions">
          <a href="giving.html" class="btn btn-primary">Try Again</a>
          <a href="index.html" class="btn btn-outline-gold">Back to Home</a>
        </div>
      `);
    }
  }
});
