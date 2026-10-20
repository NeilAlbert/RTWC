/**
 * ROYAL TEMPLE WORSHIP CENTRE - Leadership Routes
 * GET /api/leadership - all leaders ordered by display_order, grouped by role
 * 
 * Returns: { pastors: [...], presidingElder: [...], secretary: [...], 
 *            elders: [...], deacons: [...], deaconesses: [...], ministryLeaders: [...] }
 * Each ministry leader includes the ministry name and slug via a join.
 * Pastor and wife come back together in the pastors group.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
moment.locale('en');

/**
 * @route   GET /api/leadership
 * @desc    Get all leaders grouped by role with ministry names
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Get all leaders with their ministry info
    const [leaders] = await pool.query(`
      SELECT l.id, l.name, l.role, l.photo_url, l.bio, l.display_order,
             m.name as ministry_name, m.slug as ministry_slug
      FROM leadership l
      LEFT JOIN ministries m ON l.ministry_id = m.id
      ORDER BY l.display_order, l.role
    `);

    // Group by role, maintaining the order specified
    const groups = {
      pastors: [],
      presidingElder: [],
      secretary: [],
      elders: [],
      deacons: [],
      deaconesses: [],
      ministryLeaders: []
    };

    leaders.forEach(leader => {
      const role = leader.role;

      // Handle the pastor/wife combination - both go in 'pastors' group
      if (role === 'pastor' || role === 'pastors_wife') {
        groups.pastors.push({
          id: leader.id,
          name: leader.name,
          role: role,
          photo_url: leader.photo_url,
          bio: leader.bio,
          ministry_name: leader.ministry_name,
          ministry_slug: leader.ministry_slug
        });
      } else if (groups.hasOwnProperty(role)) {
        groups[role].push({
          id: leader.id,
          name: leader.name,
          role: role,
          photo_url: leader.photo_url,
          bio: leader.bio,
          ministry_name: leader.ministry_name,
          ministry_slug: leader.ministry_slug
        });
      }
      // Handle any other roles that might exist
      else {
        // Add to ministryLeaders as fallback if it's a ministry_leader role
        if (role === 'ministry_leader') {
          groups.ministryLeaders.push({
            id: leader.id,
            name: leader.name,
            role: role,
            photo_url: leader.photo_url,
            bio: leader.bio,
            ministry_name: leader.ministry_name,
            ministry_slug: leader.ministry_slug
          });
        }
      }
    });

    // Remove empty groups that have no leaders
    const filteredGroups = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 0) {
        filteredGroups[key] = groups[key];
      }
    });

    return res.json({
      success: true,
      data: filteredGroups
    });

  } catch (error) {
    console.error('Leadership error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leadership'
    });
  }
});

module.exports = router;