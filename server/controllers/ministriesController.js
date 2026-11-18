/**
 * =============================================================================
 * controllers/ministriesController.js — ministries business logic.
 * =============================================================================
 */
const Ministry = require('../models/ministryModel');
const { NotFoundError } = require('../utils/errors');
const cache = require('../utils/cache');

const CACHE_TTL = 60; // seconds; cleared at once by any admin change
// Leaders are listed with their ministry's name, so a ministry change clears both.
const clearCache = () => cache.invalidate('ministries:', 'leadership:');

/** "Men's Ministry (PEMEM)" becomes "mens-ministry-pemem". */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

/** Answers a save that clashes with another ministry, in the same shape as a validation error. */
function conflict(res, field, message) {
  return res.status(409).json({
    success: false,
    message: 'Some fields need attention. Nothing was saved.',
    data: { errors: [{ field, message }] },
  });
}

/**
 * Checks the name is not already used and settles the slug: the one typed, or one
 * made from the name when it was left blank. Returns null after answering the
 * request itself when something clashes.
 */
async function prepareMinistry(req, res, exceptId = 0) {
  const { name } = req.body;
  if (await Ministry.findByName(name, exceptId)) {
    conflict(res, 'name', 'Another ministry already has this name.');
    return null;
  }

  let slug = req.body.slug;
  if (slug) {
    if (await Ministry.slugTaken(slug, exceptId)) {
      conflict(res, 'slug', 'Another ministry already uses this slug.');
      return null;
    }
  } else {
    const base = slugify(name) || 'ministry';
    slug = base;
    // eslint-disable-next-line no-await-in-loop
    for (let n = 2; await Ministry.slugTaken(slug, exceptId); n += 1) slug = `${base}-${n}`;
  }

  return { ...req.body, slug };
}

/** GET /api/ministries — public */
async function getMinistries(req, res, next) {
  try {
    const data = await cache.wrap('ministries:list', CACHE_TTL, () => Ministry.findAll());
    return res.json({ success: true, message: 'Ministries fetched successfully.', data });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/ministries/:slug — public */
async function getMinistryBySlug(req, res, next) {
  try {
    const ministry = await Ministry.findBySlug(req.params.slug);
    if (!ministry) return next(new NotFoundError('Ministry not found.'));
    return res.json({ success: true, message: 'Ministry fetched successfully.', data: ministry });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/ministries — admin only */
async function createMinistry(req, res, next) {
  try {
    const values = await prepareMinistry(req, res);
    if (!values) return undefined;
    const ministry = await Ministry.create(values);
    await clearCache();
    return res.status(201).json({ success: true, message: 'Ministry created successfully.', data: ministry });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/ministries/:id — admin only */
async function updateMinistry(req, res, next) {
  try {
    const existing = await Ministry.findById(req.params.id);
    if (!existing) return next(new NotFoundError('Ministry not found.'));
    const values = await prepareMinistry(req, res, Number(req.params.id));
    if (!values) return undefined;
    const ministry = await Ministry.update(req.params.id, values);
    await clearCache();
    return res.json({ success: true, message: 'Ministry updated successfully.', data: ministry });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/ministries/:id — admin only */
async function deleteMinistry(req, res, next) {
  try {
    const existing = await Ministry.findById(req.params.id);
    if (!existing) return next(new NotFoundError('Ministry not found.'));

    // Without this check the database would quietly unlink the leaders instead.
    const leaders = await Ministry.countLeaders(req.params.id);
    if (leaders > 0) {
      const one = leaders === 1;
      return res.status(409).json({
        success: false,
        message: `This ministry still has ${leaders} ${one ? 'leader' : 'leaders'}. Reassign or delete ${one ? 'that leader' : 'those leaders'} on the Leadership page first.`,
      });
    }

    await Ministry.remove(req.params.id);
    await clearCache();
    return res.json({ success: true, message: 'Ministry deleted successfully.', data: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMinistries, getMinistryBySlug, createMinistry, updateMinistry, deleteMinistry };
