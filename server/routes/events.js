/**
 * ROYAL TEMPLE WORSHIP CENTRE - Events Routes
 * GET /api/events - supports ?upcoming=true|false, ?category=
 * Upcoming sorted soonest first, past sorted most recent first
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const moment = require('moment');

/**
 * @route   GET /api/events
 * @desc    List events with optional filters
 * @access  Public
 * 
 * Query params:
 * - ?upcoming=true|false - filter by upcoming/past compared to server date
 * - ?category= - enum: convention, revival, camp_meeting, anniversary, other
 * - Upcoming: sorted by event_date ascending (soonest first)
 * - Past: sorted by event_date descending (most recent first)
 */
router.get('/', async (req, res) => {
  try {
    const upcoming = req.query.upcoming !== undefined;
    const category = req.query.category || null;

    const whereConditions = [];
    const params = [];

    // Filter by category
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    // Determine date filter
    const now = moment.utc();
    
    if (upcoming) {
      whereConditions.push('event_date >= ?');
      params.push(now.format('YYYY-MM-DD'));
      // Upcoming: sorted soonest first
      const order = 'event_date ASC, event_time ASC';
      const [rows] = await pool.query(
        `SELECT id, title, description, event_date, event_time, location, category 
         FROM events 
         WHERE event_date >= ?
         ORDER BY ${order}`,
        params
      );
      return res.json({
        success: true,
        data: { events: rows, type: 'upcoming' }
      });
    } else {
      whereConditions.push('event_date < ?');
      params.push(now.format('YYYY-MM-DD'));
      // Past: sorted most recent first
      const order = 'event_date DESC, event_time DESC';
      const [rows] = await pool.query(
        `SELECT id, title, description, event_date, event_time, location, category 
         FROM events 
         WHERE event_date < ?
         ORDER BY ${order}`,
        params
      );
      return res.json({
        success: true,
        data: { events: rows, type: 'past' }
      });
    }
  } catch (error) {
    console.error('Events error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

module.exports = router;