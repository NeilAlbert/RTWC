/**
 * =============================================================================
 * routes/admin.js: endpoints only the admin dashboard uses, under /api/admin.
 * Every route here requires a signed-in admin.
 *
 * Adding, editing and deleting content uses the existing admin-only routes
 * (POST, PUT and DELETE on /api/sermons, /api/events, /api/ministries and
 * /api/leadership). This file adds the lists the admin tables need, the image
 * upload, the inbox (contact messages, prayer requests, newsletter) and the
 * dashboard counts.
 * =============================================================================
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { uploadImage } = require('../middleware/upload');
const { getMessages, updateMessageStatus } = require('../controllers/contactController');
const { updateRequestStatus } = require('../controllers/prayerRequestsController');
const {
  listSermons,
  listEvents,
  listMinistries,
  listLeadership,
  deleteMessage,
  listPrayerRequests,
  getPrayerRequest,
  deletePrayerRequest,
  listSubscribers,
  deleteSubscriber,
  getStats,
} = require('../controllers/adminController');

const router = express.Router();

const ROLES = ['pastor', 'pastors_wife', 'presiding_elder', 'secretary', 'elder', 'deacon', 'deaconess', 'ministry_leader'];
const pageRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit.'),
];

router.use(authMiddleware);

/** POST /api/admin/upload — one image, form field "image". Answers { url }. */
router.post('/upload', uploadImage);

/** GET /api/admin/sermons — newest first, ?q= searches the title, paginated */
router.get(
  '/sermons',
  [query('q').optional().trim().isLength({ max: 200 }).withMessage('Search for 200 characters or fewer.'), ...pageRules],
  validateRequest,
  listSermons
);

/** GET /api/admin/events — ?when=upcoming|past|all, paginated */
router.get(
  '/events',
  [query('when').optional().isIn(['upcoming', 'past', 'all']).withMessage('Invalid filter.'), ...pageRules],
  validateRequest,
  listEvents
);

/** GET /api/admin/ministries — every ministry with its number of leaders */
router.get('/ministries', listMinistries);

/** GET /api/admin/leadership — every leader as one list, ?role= filters */
router.get(
  '/leadership',
  [query('role').optional({ values: 'falsy' }).isIn(ROLES).withMessage('Invalid role.')],
  validateRequest,
  listLeadership
);

const MESSAGE_STATUSES = ['new', 'read', 'responded'];
const PRAYER_STATUSES = ['new', 'prayed_for'];
const idRule = [param('id').isInt({ min: 1 }).withMessage('Invalid id.')];

/** GET /api/admin/stats — counts for the dashboard and the sidebar */
router.get('/stats', getStats);

/** GET /api/admin/contact — newest first, ?status=new|read|responded, paginated */
router.get(
  '/contact',
  [query('status').optional({ values: 'falsy' }).isIn(MESSAGE_STATUSES).withMessage('Invalid status.'), ...pageRules],
  validateRequest,
  getMessages
);

/** PATCH /api/admin/contact/:id/status — body { status } */
router.patch(
  '/contact/:id/status',
  [...idRule, body('status').isIn(MESSAGE_STATUSES).withMessage('Status must be new, read or responded.')],
  validateRequest,
  updateMessageStatus
);

/** DELETE /api/admin/contact/:id */
router.delete('/contact/:id', idRule, validateRequest, deleteMessage);

/** GET /api/admin/prayer-requests — newest first, ?status=new|prayed_for, paginated */
router.get(
  '/prayer-requests',
  [query('status').optional({ values: 'falsy' }).isIn(PRAYER_STATUSES).withMessage('Invalid status.'), ...pageRules],
  validateRequest,
  listPrayerRequests
);

/** GET /api/admin/prayer-requests/:id — the whole request, including a private one */
router.get('/prayer-requests/:id', idRule, validateRequest, getPrayerRequest);

/** PATCH /api/admin/prayer-requests/:id/status — body { status } */
router.patch(
  '/prayer-requests/:id/status',
  [...idRule, body('status').isIn(PRAYER_STATUSES).withMessage('Status must be new or prayed_for.')],
  validateRequest,
  updateRequestStatus
);

/** DELETE /api/admin/prayer-requests/:id */
router.delete('/prayer-requests/:id', idRule, validateRequest, deletePrayerRequest);

/** GET /api/admin/newsletter — newest first, ?q= searches the email address, paginated */
router.get(
  '/newsletter',
  [
    query('q').optional().trim().isLength({ max: 255 }).withMessage('Search for 255 characters or fewer.'),
    query('page').optional().isInt({ min: 1 }).withMessage('Invalid page.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit.'),
  ],
  validateRequest,
  listSubscribers
);

/** DELETE /api/admin/newsletter/:id */
router.delete('/newsletter/:id', idRule, validateRequest, deleteSubscriber);

module.exports = router;
