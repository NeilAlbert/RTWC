/**
 * =============================================================================
 * utils/paystack.js — Paystack payment gateway helpers.
 *
 * Uses native fetch (Node 18+), so no extra npm dependency is required.
 *
 * SECURITY:
 *  - PAYSTACK_SECRET_KEY is used ONLY here, server-side. It must never be
 *    exposed to the frontend (the frontend never even needs the public key,
 *    because we use Paystack's hosted checkout redirect flow).
 *  - Webhook signatures are verified with HMAC-SHA512 over the RAW request
 *    body before any payload is trusted.
 * =============================================================================
 */
const crypto = require('crypto');
const logger = require('./logger');

const PAYSTACK_API = 'https://api.paystack.co';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/** All amounts passed to Paystack must be in the smallest currency unit
 *  (pesewas for GHS) and must be integers. */
function toMinorUnits(amountCedis) {
  return Math.round(Number(amountCedis) * 100);
}

/** Returns the secret key or throws — callers use this to fail gracefully
 *  with a 503 instead of sending `Bearer undefined` to Paystack. */
function getSecretKey() {
  if (!SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server.');
  }
  return SECRET_KEY;
}

/**
 * POST /transaction/initialize — creates a hosted Paystack checkout session.
 * @param {object} opts - { email, amountCedis, currency, reference, callbackUrl }
 * @returns {Promise<object>} Paystack data (authorization_url, access_code, reference)
 */
async function initializeTransaction({ email, amountCedis, currency = 'GHS', reference, callbackUrl }) {
  const body = {
    email,
    amount: toMinorUnits(amountCedis),
    currency,
    reference,
    callback_url: callbackUrl,
  };

  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.status) {
    logger.error('Paystack initialize failed', {
      status: response.status,
      message: payload.message,
      reference,
    });
    throw new Error(payload.message || `Paystack initialize returned HTTP ${response.status}.`);
  }

  return payload.data;
}

/**
 * GET /transaction/verify/{reference} — confirms the transaction status with
 * Paystack (authoritative source for status *reporting* only).
 */
async function verifyTransaction(reference) {
  const response = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.status) {
    if (response.status === 404) {
      const err = new Error('No transaction found for this reference.');
      err.status = 404;
      throw err;
    }
    logger.error('Paystack verify failed', {
      status: response.status,
      message: payload.message,
      reference,
    });
    throw new Error(payload.message || `Paystack verify returned HTTP ${response.status}.`);
  }

  return payload.data;
}

/**
 * Verifies the Paystack webhook signature.
 *
 * Paystack computes HMAC-SHA512 over the RAW request body using the secret key
 * and sends it hex-encoded in the `x-paystack-signature` header. We recompute
 * it and compare in constant time — never trusting an unverified payload.
 *
 * @param {Buffer|string} rawBody - the raw request body bytes
 * @param {string} [signature] - value of the x-paystack-signature header
 * @returns {boolean}
 */
function isValidWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody) return false;

  const expected = crypto
    .createHmac('sha512', getSecretKey())
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');

  // timingSafeEqual throws on length mismatch — guard first, then compare.
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/** Maps Paystack's transaction status to our simplified donor-facing status. */
function mapTransactionStatus(paystackStatus) {
  switch (paystackStatus) {
    case 'success':
      return 'completed';
    case 'pending':
      return 'pending';
    case 'failed':
    case 'abandoned':
    default:
      return 'failed';
  }
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  isValidWebhookSignature,
  mapTransactionStatus,
};
