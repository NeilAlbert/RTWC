const Announcement = require('../models/announcementModel');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError } = require('../utils/errors');

async function getAnnouncements(req, res, next) {
  try {
    const includeUnpublished = Boolean(req.adminLibrary);
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 10, 50);
    const filter = { includeUnpublished, search: req.query.q || undefined };
    const [total, items] = await Promise.all([
      Announcement.countAll(filter),
      Announcement.findAll({ ...filter, limit, offset }),
    ]);
    return res.json({
      success: true,
      message: 'Announcements fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const item = await Announcement.create(req.body);
    return res.status(201).json({ success: true, message: 'Announcement created.', data: item });
  } catch (err) {
    return next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) return next(new NotFoundError('Announcement not found.'));
    const item = await Announcement.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Announcement updated.', data: item });
  } catch (err) {
    return next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const deleted = await Announcement.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Announcement not found.'));
    return res.json({ success: true, message: 'Announcement deleted.', data: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };