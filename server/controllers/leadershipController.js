/**
 * =============================================================================
 * controllers/leadershipController.js — leadership business logic.
 *
 * GET /api/leadership groups people by role to match the frontend sections:
 *   - pastoralPair       (pastor + pastors_wife)
 *   - executive          (presiding_elder, secretary)
 *   - elders             (elder)
 *   - deaconsDeaconesses (deacon, deaconess)
 *   - ministryLeaders    (ministry_leader, with ministry info)
 * =============================================================================
 */
const Leadership = require('../models/leadershipModel');
const { NotFoundError } = require('../utils/errors');

function formatMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    ministry: row.ministry_name || null,
    ministrySlug: row.ministry_slug || null,
    photoUrl: row.photo_url,
    bio: row.bio,
    displayOrder: row.display_order,
  };
}

/** GET /api/leadership — public, grouped by role */
async function getLeadership(req, res, next) {
  try {
    const rows = await Leadership.findAll();

    const groups = {
      pastoralPair: [],
      executive: [],
      elders: [],
      deaconsDeaconesses: [],
      ministryLeaders: [],
    };

    rows.forEach((row) => {
      const member = formatMember(row);
      switch (row.role) {
        case 'pastor':
        case 'pastors_wife':
          groups.pastoralPair.push(member);
          break;
        case 'presiding_elder':
        case 'secretary':
          groups.executive.push(member);
          break;
        case 'elder':
          groups.elders.push(member);
          break;
        case 'deacon':
        case 'deaconess':
          groups.deaconsDeaconesses.push(member);
          break;
        case 'ministry_leader':
          groups.ministryLeaders.push(member);
          break;
        default:
          break;
      }
    });

    return res.json({ success: true, message: 'Leadership fetched successfully.', data: groups });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/leadership — admin only */
async function createMember(req, res, next) {
  try {
    const member = await Leadership.create(req.body);
    return res.status(201).json({ success: true, message: 'Leadership member created successfully.', data: formatMember(member) });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/leadership/:id — admin only */
async function updateMember(req, res, next) {
  try {
    const existing = await Leadership.findById(req.params.id);
    if (!existing) return next(new NotFoundError('Leadership member not found.'));
    const member = await Leadership.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Leadership member updated successfully.', data: formatMember(member) });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/leadership/:id — admin only */
async function deleteMember(req, res, next) {
  try {
    const deleted = await Leadership.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Leadership member not found.'));
    return res.json({ success: true, message: 'Leadership member deleted successfully.', data: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getLeadership, createMember, updateMember, deleteMember };
