/**
 * =============================================================================
 * controllers/givingController.js — online giving business logic (Paystack).
 *
 * Payment flow:
 *   1. POST /api/giving/initiate — validates the donor + amount, creates a
 *      PENDING giving_records row with a UNIQUE payment_reference, calls
 *      Paystack's Initialize Transaction API, and returns the hosted checkout
 *      URL (authorization_url) for the frontend to redirect to.
 *   2. POST /api/giving/webhook — Paystack's server-to-server callback. The
 *      payload signature is verified (HMAC-SHA512 over the raw body) before
 *      anything is trusted. Idempotent: an already-completed reference is
 *      acknowledged without re-processing. On charge.success the record is
 *      marked completed (with the payment channel stored) and a thank-you
 *      email is sent AFTER the 200 response.
 *   3. GET /api/giving/verify/:reference — public status lookup for the
 *      frontend after the donor returns from Paystack. Reports status only;
 *      completion is NEVER recorded here (only the verified webhook marks a
 *      donation complete).
 *   4. GET /api/giving/history — admin dashboard with filters + per-category
 *      summary totals.
 * =============================================================================
 */
const crypto = require('crypto');
const GivingRecord = require('../models/givingRecordModel');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { sendMail } = require('../utils/mailer');
const paystack = require('../utils/paystack');
const logger = require('../utils/logger');

/** Human-friendly category labels used in emails + responses. */
const CATEGORY_LABELS = {
  tithe: 'Tithe',
  offering: 'Free-Will Offering',
  building_fund: 'Building & Development Fund',
  thanksgiving: 'Thanksgiving Offering',
  seed_offering: 'Seed Offering & Missions',
};

/** Default redirect target after payment (overridable via PAYSTACK_CALLBACK_URL). */
const DEFAULT_CALLBACK_URL = 'https://royaltemple.org/giving-callback.html';

function formatAmountCedis(amount) {
  return `GH₵ ${Number(amount).toFixed(2)}`;
}

/**
 * POST /api/giving/initiate — public (rate-limited).
 * Creates a pending record, initializes a Paystack transaction, and returns
 * the hosted checkout URL.
 */
async function initiateGiving(req, res, next) {
  try {
    const { name, email, amount, category } = req.body;

    if (!process.env.PAYSTACK_SECRET_KEY) {
      logger.warn('Giving initiate attempted without PAYSTACK_SECRET_KEY');
      return res.status(503).json({
        success: false,
        message: 'Online giving is temporarily unavailable. Please use our Bank Transfer or Mobile Money details below.',
      });
    }

    const paymentReference = `RTWC-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const record = await GivingRecord.create({
      name,
      email,
      amount,
      category,
      paymentReference,
    });

    // Ask Paystack for a hosted checkout session.
    let checkout;
    try {
      checkout = await paystack.initializeTransaction({
        email,
        amountCedis: amount,
        currency: 'GHS',
        reference: paymentReference,
        callbackUrl: process.env.PAYSTACK_CALLBACK_URL || DEFAULT_CALLBACK_URL,
      });
    } catch (payErr) {
      // Mark the record failed so it never shows as an unfulfilled pending row.
      await GivingRecord.updateByReference(paymentReference, { status: 'failed' }).catch(() => {});
      logger.error('Paystack initialize failed', { message: payErr.message, reference: paymentReference });
      return res.status(503).json({
        success: false,
        message: 'We could not reach the secure payment processor right now. Please try again in a moment, or use our Bank Transfer / Mobile Money details below.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Redirecting you to secure payment…',
      data: {
        paymentReference,
        authorizationUrl: checkout.authorization_url,
        paymentStatus: record.payment_status,
        amount: record.amount,
        category: record.category,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/giving/webhook — Paystack callback. Signature-verified and
 * idempotent. Always acknowledges quickly (200); the thank-you email is sent
 * after the response has gone out.
 */
async function handleGivingWebhook(req, res, next) {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      // Without the secret we can't verify the signature — refuse clearly
      // rather than return a masked 500 that makes Paystack retry forever.
      logger.warn('Giving webhook rejected: PAYSTACK_SECRET_KEY not configured');
      return res.status(503).json({ success: false, message: 'Payment processing is not configured on this server.' });
    }

    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    // Reject anything that does not carry a valid Paystack signature.
    if (!paystack.isValidWebhookSignature(rawBody, signature)) {
      logger.warn('Giving webhook rejected: invalid signature', { ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const { event } = req.body;
    const data = req.body.data || {};

    // We only care about successful charges — acknowledge everything else.
    if (event !== 'charge.success') {
      return res.json({ success: true, message: 'Webhook event ignored.' });
    }

    const reference = data.reference;
    if (!reference) {
      return res.json({ success: true, message: 'Webhook acknowledged (no reference).' });
    }

    const record = await GivingRecord.findByReference(reference);
    if (!record) {
      logger.warn('Giving webhook for unknown reference', { reference });
      return res.json({ success: true, message: 'Webhook acknowledged (unknown reference).' });
    }

    // IDEMPOTENCY: Paystack may resend the same webhook. If already completed,
    // acknowledge and do nothing further (prevents double-counting). Fast path.
    if (record.payment_status === 'completed') {
      return res.json({ success: true, message: 'Webhook already processed. No action taken.' });
    }

    // Store a useful bit of Paystack metadata: the channel used (card, mobile_money, …).
    // The UPDATE is atomic (`WHERE payment_status != 'completed'`), so even if a
    // duplicate webhook races us, exactly one call wins and the other sees
    // alreadyCompleted — preventing a double thank-you email.
    const paymentChannel = typeof data.channel === 'string' ? data.channel.slice(0, 50) : null;
    const updated = await GivingRecord.updateByReference(reference, {
      status: 'completed',
      paymentChannel,
    });

    if (!updated || updated.alreadyCompleted) {
      // A concurrent duplicate completed this reference first — acknowledge, no email.
      return res.json({ success: true, message: 'Webhook already processed. No action taken.' });
    }

    logger.info('Giving payment completed via webhook', { reference, channel: paymentChannel });

    // Respond 200 FIRST — Paystack retries if it doesn't get a fast ack.
    // Slower work (thank-you email) happens after, without blocking the reply.
    res.json({ success: true, message: 'Webhook processed.' });

    sendDonationThankYou(updated).catch((mailErr) => {
      logger.error('Giving thank-you email failed', { reference, message: mailErr.message });
    });

    return undefined;
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/giving/verify/:reference — public status check.
 * Reads from Paystack (falling back to our DB row) purely for display.
 * NEVER records completion here — only the verified webhook does that.
 */
async function verifyGiving(req, res, next) {
  try {
    const { reference } = req.params;

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ success: false, message: 'Payment verification is temporarily unavailable.' });
    }

    // If the webhook has already completed this reference, report that.
    const record = await GivingRecord.findByReference(reference);
    if (record && record.payment_status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment verified.',
        data: { reference, status: 'completed' },
      });
    }

    const transaction = await paystack.verifyTransaction(reference);
    const status = paystack.mapTransactionStatus(transaction.status);

    return res.json({
      success: true,
      message: 'Payment status retrieved.',
      data: { reference, status },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/giving/history — admin only.
 * Paginated, filterable by category + date range, with summary totals
 * per category (completed payments only).
 */
async function getGivingHistory(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 10, 50);

    const filter = {
      category: req.query.category || undefined,
      from: req.query.from || undefined, // YYYY-MM-DD
      to: req.query.to || undefined,     // YYYY-MM-DD
    };

    const total = await GivingRecord.countAll(filter);
    const items = await GivingRecord.findAll({ ...filter, limit, offset });
    const summaryRows = await GivingRecord.totalsByCategory(filter);

    const summary = {};
    summaryRows.forEach((row) => { summary[row.category] = { count: row.count, total: Number(row.total) }; });

    return res.json({
      success: true,
      message: 'Giving history fetched successfully.',
      data: {
        items,
        pagination: buildPaginationMeta(total, page, limit),
        summary,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/** Sends the donor a confirmation email after a verified completed payment. */
async function sendDonationThankYou(record) {
  if (!record || !record.email) return;

  const categoryLabel = CATEGORY_LABELS[record.category] || record.category;

  await sendMail({
    to: record.email,
    subject: 'Thank You for Your Gift — Royal Temple Worship Centre',
    text:
      `Dear ${record.name},\n\n` +
      `Thank you for your generous ${categoryLabel} of ${formatAmountCedis(record.amount)} ` +
      `to Royal Temple Worship Centre (The Church of Pentecost).\n\n` +
      `Your giving supports holy living, spirit-filled worship, and global evangelism. ` +
      `May the Lord bless you richly as you sow into His kingdom.\n\n` +
      `Your reference: ${record.payment_reference}\n\n` +
      `God bless you,\nRoyal Temple Worship Centre`,
    html:
      `<p>Dear ${record.name},</p>` +
      `<p>Thank you for your generous <strong>${categoryLabel}</strong> of ` +
      `<strong>${formatAmountCedis(record.amount)}</strong> to Royal Temple Worship Centre (The Church of Pentecost).</p>` +
      `<p>Your giving supports holy living, spirit-filled worship, and global evangelism. ` +
      `May the Lord bless you richly as you sow into His kingdom.</p>` +
      `<p><em>Your reference: ${record.payment_reference}</em></p>` +
      `<p>God bless you,<br>Royal Temple Worship Centre</p>`,
  });
}

module.exports = { initiateGiving, handleGivingWebhook, verifyGiving, getGivingHistory };
