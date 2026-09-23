/**
 * =============================================================================
 * controllers/ministriesController.js — ministries business logic.
 * =============================================================================
 */
const Ministry = require('../models/ministryModel');
const { NotFoundError } = require('../utils/errors');

/** GET /api/ministries — public */
async function getMinistries(req, res, next) {
  try {
    const data = await Ministry.findAll();
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
    const ministry = await Ministry.create(req.body);
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
    const ministry = await Ministry.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Ministry updated successfully.', data: ministry });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/ministries/:id — admin only */
async function deleteMinistry(req, res, next) {
  try {
    const deleted = await Ministry.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Ministry not found.'));
    return res.json({ success: true, message: 'Ministry deleted successfully.', data: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMinistries, getMinistryBySlug, createMinistry, updateMinistry, deleteMinistry };
