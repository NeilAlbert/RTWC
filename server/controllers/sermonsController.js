/**
 * =============================================================================
 * controllers/sermonsController.js — sermons business logic.
 * =============================================================================
 */
const Sermon = require('../models/sermonModel');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const { NotFoundError } = require('../utils/errors');

/** GET /api/sermons — public, ?speaker=&date=&page=&limit= */
async function getSermons(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 10, 50);

    const filter = {
      speaker: req.query.speaker || undefined,
      date: req.query.date || undefined,
    };

    const total = await Sermon.countAll(filter);
    const items = await Sermon.findAll({ ...filter, limit, offset });

    return res.json({
      success: true,
      message: 'Sermons fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/sermons/:id — public */
async function getSermonById(req, res, next) {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return next(new NotFoundError('Sermon not found.'));
    return res.json({ success: true, message: 'Sermon fetched successfully.', data: sermon });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/sermons — admin only */
async function createSermon(req, res, next) {
  try {
    const sermon = await Sermon.create(req.body);
    return res.status(201).json({ success: true, message: 'Sermon created successfully.', data: sermon });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/sermons/:id — admin only */
async function updateSermon(req, res, next) {
  try {
    const existing = await Sermon.findById(req.params.id);
    if (!existing) return next(new NotFoundError('Sermon not found.'));
    const sermon = await Sermon.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Sermon updated successfully.', data: sermon });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/sermons/:id — admin only */
async function deleteSermon(req, res, next) {
  try {
    const deleted = await Sermon.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Sermon not found.'));
    return res.json({ success: true, message: 'Sermon deleted successfully.', data: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getSermons, getSermonById, createSermon, updateSermon, deleteSermon };
