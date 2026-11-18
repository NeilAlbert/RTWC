/**
 * routes/admin.js: everything the admin dashboard does, under /api/admin.
 *
 * Every route here needs a signed-in admin (authMiddleware, applied once below),
 * checks its input with express-validator and validateRequest, and passes the
 * free text of a saved form through sanitizeBody, which strips HTML tags.
 *
 * The public site caches its lists of sermons, events, ministries and leaders
 * for 60 seconds (utils/cache.js). Each save or delete here clears the matching
 * cache in its controller, so the change shows on the public site at once, on
 * every copy of the server.
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { uploadImage } = require('../middleware/upload');
const Ministry = require('../models/ministryModel');
const {
  UPLOAD_NAME_PATTERN, EVENT_CATEGORIES, LEADER_ROLES, isHttpUrl, isImageRef, isCalendarDate,
} = require('../utils/validators');
const { createSermon, updateSermon, deleteSermon } = require('../controllers/sermonsController');
const { createEvent, updateEvent, deleteEvent } = require('../controllers/eventsController');
const { createMinistry, updateMinistry, deleteMinistry } = require('../controllers/ministriesController');
const { createMember, updateMember, deleteMember } = require('../controllers/leadershipController');
const { listMedia, deleteMedia } = require('../controllers/mediaController');
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
  getStatus,
} = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware);

const idRule = [param('id').isInt({ min: 1 }).withMessage('Invalid id.')];
/** ?page, ?limit and ?q, the same on every list. */
const listRules = [
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit.'),
  query('q').optional().isString().bail().trim().isLength({ max: 200 }).withMessage('Search for 200 characters or fewer.'),
];
const optional = { values: 'falsy' };

/** GET /api/admin/stats: counts, recent new messages and next events. Takes no input. */
router.get('/stats', validateRequest, getStats);

/** GET /api/admin/status: whether Redis is set up and working. Takes no input. */
router.get('/status', getStatus);

// ---------------------------------------------------------------------------
// Sermons
// ---------------------------------------------------------------------------
const sermonText = sanitizeBody(['title', 'speaker', 'description'], { maxLength: 5000 });
const sermonRules = [
  body('title').isString().bail().trim().isLength({ min: 1, max: 200 }).withMessage('Enter a title of 200 characters or fewer.'),
  body('speaker').isString().bail().trim().isLength({ min: 1, max: 120 }).withMessage('Enter the speaker, in 120 characters or fewer.'),
  body('description').optional(optional).isString().isLength({ max: 5000 })
    .withMessage('The description must be 5000 characters or fewer.'),
  body('video_url').optional(optional).isString().bail().trim().isLength({ max: 500 }).custom(isHttpUrl)
    .withMessage('The video link must start with http:// or https://.'),
  body('thumbnail_url').optional(optional).isString().bail().trim().isLength({ max: 500 }).custom(isImageRef)
    .withMessage('The thumbnail must be an uploaded image or a link that starts with http:// or https://.'),
  body('sermon_date').custom(isCalendarDate).withMessage('Enter a valid date.'),
];

router.get('/sermons', listRules, validateRequest, listSermons);
router.post('/sermons', sermonText, sermonRules, validateRequest, createSermon);
router.put('/sermons/:id', sermonText, [...idRule, ...sermonRules], validateRequest, updateSermon);
router.delete('/sermons/:id', idRule, validateRequest, deleteSermon);

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const eventText = sanitizeBody(['title', 'description', 'event_time', 'location'], { maxLength: 5000 });
const eventRules = [
  body('title').isString().bail().trim().isLength({ min: 1, max: 255 }).withMessage('Enter a title of 255 characters or fewer.'),
  body('description').optional(optional).isString().isLength({ max: 5000 })
    .withMessage('The description must be 5000 characters or fewer.'),
  body('event_date').custom(isCalendarDate).withMessage('Enter a valid date.'),
  body('event_time').optional(optional).isString().bail().trim().isLength({ max: 50 })
    .withMessage('The time must be 50 characters or fewer.'),
  body('location').optional(optional).isString().bail().trim().isLength({ max: 255 })
    .withMessage('The location must be 255 characters or fewer.'),
  body('category').isIn(EVENT_CATEGORIES).withMessage('Choose a type of event.'),
];

router.get(
  '/events',
  [...listRules, query('when').optional().isIn(['upcoming', 'past', 'all']).withMessage('Invalid filter.')],
  validateRequest,
  listEvents
);
router.post('/events', eventText, eventRules, validateRequest, createEvent);
router.put('/events/:id', eventText, [...idRule, ...eventRules], validateRequest, updateEvent);
router.delete('/events/:id', idRule, validateRequest, deleteEvent);

// ---------------------------------------------------------------------------
// Ministries. A blank slug is allowed: the controller makes one from the name.
// The controller also refuses a name or slug another ministry already has, and
// refuses to delete a ministry that still has leaders.
// ---------------------------------------------------------------------------
const ministryText = sanitizeBody(['name', 'slug', 'description'], { maxLength: 5000 });
const ministryRules = [
  body('name').isString().bail().trim().isLength({ min: 1, max: 150 }).withMessage('Enter a name of 150 characters or fewer.'),
  body('slug').optional(optional).isString().bail().trim().isLength({ max: 150 }).matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('The slug may only have lowercase letters, numbers and single hyphens, for example "youth-ministry".'),
  body('description').optional(optional).isString().isLength({ max: 5000 })
    .withMessage('The description must be 5000 characters or fewer.'),
  body('icon_url').optional(optional).isString().bail().trim().isLength({ max: 500 }).custom(isImageRef)
    .withMessage('The icon must be an uploaded image or a link that starts with http:// or https://.'),
];

router.get('/ministries', listRules, validateRequest, listMinistries);
router.post('/ministries', ministryText, ministryRules, validateRequest, createMinistry);
router.put('/ministries/:id', ministryText, [...idRule, ...ministryRules], validateRequest, updateMinistry);
router.delete('/ministries/:id', idRule, validateRequest, deleteMinistry);

// ---------------------------------------------------------------------------
// Leadership
// ---------------------------------------------------------------------------
const leaderText = sanitizeBody(['name', 'bio'], { maxLength: 5000 });
const leaderRules = [
  body('name').isString().bail().trim().isLength({ min: 1, max: 150 }).withMessage('Enter a name of 150 characters or fewer.'),
  body('role').isIn(LEADER_ROLES).withMessage('Choose a role.'),
  // A ministry is needed only for a ministry leader, and it must be a real one.
  // For every other role the controller stores no ministry.
  body('ministry_id').custom(async (value, { req }) => {
    if (req.body.role !== 'ministry_leader') return true;
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new Error('Choose the ministry this person leads.');
    if (!(await Ministry.findById(id))) throw new Error('That ministry no longer exists. Choose another.');
    return true;
  }),
  body('photo_url').optional(optional).isString().bail().trim().isLength({ max: 500 }).custom(isImageRef)
    .withMessage('The photo must be an uploaded image or a link that starts with http:// or https://.'),
  body('bio').optional(optional).isString().isLength({ max: 5000 })
    .withMessage('The bio must be 5000 characters or fewer.'),
  body('display_order').optional(optional).isInt({ min: 0, max: 9999 })
    .withMessage('The order must be a whole number from 0 to 9999.').toInt(),
];

router.get(
  '/leadership',
  [...listRules, query('role').optional(optional).isIn(LEADER_ROLES).withMessage('Invalid role.')],
  validateRequest,
  listLeadership
);
router.post('/leadership', leaderText, leaderRules, validateRequest, createMember);
router.put('/leadership/:id', leaderText, [...idRule, ...leaderRules], validateRequest, updateMember);
router.delete('/leadership/:id', idRule, validateRequest, deleteMember);

// ---------------------------------------------------------------------------
// Images. The upload checks the file itself (see middleware/upload.js): there is
// no text to sanitize. A file name must be exactly what the upload route makes,
// which rules out slashes, "..", a leading dot and every other file on the disk.
// ---------------------------------------------------------------------------
/** POST /api/admin/upload: one image in the form field "image". Answers { url }. */
router.post('/upload', uploadImage);

/** GET /api/admin/media: uploaded images, newest first, with where each is used. */
router.get('/media', listRules, validateRequest, listMedia);

/** DELETE /api/admin/media/:filename: refused while the image is in use. */
router.delete(
  '/media/:filename',
  [param('filename').matches(UPLOAD_NAME_PATTERN).withMessage('That is not the name of an uploaded image.')],
  validateRequest,
  deleteMedia
);

// ---------------------------------------------------------------------------
// Inbox: contact messages, prayer requests, newsletter (reworked in Phase 3).
// ---------------------------------------------------------------------------
const MESSAGE_STATUSES = ['new', 'read', 'responded'];
const PRAYER_STATUSES = ['new', 'prayed_for'];
const pageRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit.'),
];

/** GET /api/admin/contact: newest first, ?status=new|read|responded, paginated */
router.get(
  '/contact',
  [query('status').optional(optional).isIn(MESSAGE_STATUSES).withMessage('Invalid status.'), ...pageRules],
  validateRequest,
  getMessages
);

/** PATCH /api/admin/contact/:id/status: body { status } */
router.patch(
  '/contact/:id/status',
  [...idRule, body('status').isIn(MESSAGE_STATUSES).withMessage('Status must be new, read or responded.')],
  validateRequest,
  updateMessageStatus
);

/** DELETE /api/admin/contact/:id */
router.delete('/contact/:id', idRule, validateRequest, deleteMessage);

/** GET /api/admin/prayer-requests: newest first, ?status=new|prayed_for, paginated */
router.get(
  '/prayer-requests',
  [query('status').optional(optional).isIn(PRAYER_STATUSES).withMessage('Invalid status.'), ...pageRules],
  validateRequest,
  listPrayerRequests
);

/** GET /api/admin/prayer-requests/:id: the whole request, including a private one */
router.get('/prayer-requests/:id', idRule, validateRequest, getPrayerRequest);

/** PATCH /api/admin/prayer-requests/:id/status: body { status } */
router.patch(
  '/prayer-requests/:id/status',
  [...idRule, body('status').isIn(PRAYER_STATUSES).withMessage('Status must be new or prayed_for.')],
  validateRequest,
  updateRequestStatus
);

/** DELETE /api/admin/prayer-requests/:id */
router.delete('/prayer-requests/:id', idRule, validateRequest, deletePrayerRequest);

/** GET /api/admin/newsletter: newest first, ?q= searches the email address, paginated */
router.get(
  '/newsletter',
  [query('q').optional().trim().isLength({ max: 255 }).withMessage('Search for 255 characters or fewer.'), ...pageRules],
  validateRequest,
  listSubscribers
);

/** DELETE /api/admin/newsletter/:id */
router.delete('/newsletter/:id', idRule, validateRequest, deleteSubscriber);

module.exports = router;
