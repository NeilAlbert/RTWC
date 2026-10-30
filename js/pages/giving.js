/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * Giving Page Specific JavaScript (js/pages/giving.js)
 *
 * Flow: renders giving settings from the admin panel as offline info.
 * No payment form, no amount field, no checkout redirect, no third-party scripts.
 * Supports: Tithes, Offering, Building Fund, Thanksgiving, Seed Offering.
 * Manual giving via mobile money or bank transfer.
 */

document.addEventListener('DOMContentLoaded', () => {
  initClipboardCopy();
  initMobileFirstResponsive();
});

/**
 * Initialise Clipboard API copy buttons with fallback and screen reader announcement.
 * Each .copy-btn copies its associated target element's text content.
 */
function initClipboardCopy() {
  const copyBtns = document.querySelectorAll('.copy-btn');
  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const textToCopy = targetEl.textContent.trim();

      if (navigator.clipboard && window.isSecureContext) {
        // Use modern Clipboard API
        navigator.clipboard.writeText(textToCopy).then(() => {
          showCopyConfirmation(btn, true);
        }).catch(() => fallbackCopyText(textToCopy, btn));
      } else {
        fallbackCopyText(textToCopy, btn);
      }
    });
  });
}

/**
 * Fallback: select text in a temporary textarea and copy via document.execCommand.
 */
function fallbackCopyText(text, btn) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy') ? showCopyConfirmation(btn, true) : showCopyConfirmation(btn, false);
  } catch (err) {
    showCopyConfirmation(btn, false);
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Show a "Copied" confirmation announced to screen readers, auto-reset after 2s.
 */
function showCopyConfirmation(btn, success) {
  // Announce to screen readers
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = success ? 'Copied to clipboard' : 'Failed to copy';
  announcement.style.position = 'fixed';
  announcement.style.left = '-9999px';
  announcement.style.top = '-9999px';
  document.body.appendChild(announcement);

  // Button visual feedback
  const originalText = btn.textContent;
  btn.textContent = success ? 'Copied!' : 'Copy';
  btn.classList.toggle('copied', success);
  btn.disabled = true;

  // Reset after 2 seconds
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.toggle('copied', false);
    btn.disabled = false;
    document.body.removeChild(announcement);
  }, 2000);
}

/**
 * Mobile-first responsive layout initialisation.
 * Ensures numbers never overflow, account names wrap cleanly,
 * and copy buttons are at least 44x44px touch-friendly.
 */
function initMobileFirstResponsive() {
  // Ensure copy buttons are touch-friendly (min 44x44px)
  const copyBtns = document.querySelectorAll('.copy-btn');
  copyBtns.forEach(btn => {
    btn.style.minWidth = '44px';
    btn.style.minHeight = '44px';
    btn.style.fontSize = '1rem';
  });

  // Make sure account number elements are wide enough on mobile
  const accountNumbers = document.querySelectorAll('.account-number');
  accountNumbers.forEach(el => {
    el.style.wordBreak = 'break-all';
    el.style.fontFamily = 'inherit';
  });
}