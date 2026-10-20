/**
 * ROYAL TEMPLE WORSHIP CENTRE - Sermons Routes
 * GET /api/sermons - with filters ?speaker=, ?q=, ?page=, ?limit= (default 12), newest first
 * GET /api/sermons/speakers - distinct speaker names
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route   GET /api/sermons
 * @desc    List sermons with optional filters
 * @access  Public
 * 
 * Query params:
 * - ?speaker= - filter by speaker name
 * - ?q= - search in title/description
 * - ?page= - page number (default 1)
 * - ?limit= - items per page (default 12)
 * Results are always newest first (sermon_date DESC)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const speaker = req.query.speaker || null;
    const search = req.query.q || null;

    // Build WHERE clause
    const whereConditions = [];
    const params = [];

    if (speaker) {
      whereConditions.push('speaker = ?');
      params.push(speaker);
    }

    if (search) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%search%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Count total for pagination
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM sermons ${whereClause}`,
      params
    );

    // Get sermons page
    const [sermons] = await pool.query(
      `SELECT id, title, speaker, description, video_url, thumbnail_url, sermon_date
       FROM sermons ${whereClause}
       ORDER BY sermon_date DESC
       LIMIT ? OFFSET ?
       `,
      [...params, limit, offset]
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: {
        sermons,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Sermons error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sermons'
    });
  }
});

/**
 * @route   GET /api/sermons/speakers
 * @desc    Get distinct speaker names
 * @access  Public
 */
router.get('/speakers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT speaker FROM sermons WHERE speaker IS NOT NULL ORDER BY speaker'
    );

    const speakers = rows.map(row => row.speaker).filter(s => s && s.trim());

    return res.json({
      success: true,
      data: speakers
    });

  } catch (error) {
    console.error('Sermons speakers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch speakers'
    });
  }
});

module.exports = router;