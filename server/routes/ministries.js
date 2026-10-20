/**
 * ROYAL TEMPLE WORSHIP CENTRE - Ministries Routes
 * GET /api/ministries - all ministries
 * GET /api/ministries/:slug - one ministry by slug
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route   GET /api/ministries
 * @desc    Get all ministries
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, description, icon_url FROM ministries ORDER BY name'
    );

    return res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Ministries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ministries'
    });
  }
});

/**
 * @route   GET /api/ministries/:slug
 * @desc    Get one ministry by slug
 * @access  Public
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      'SELECT id, name, slug, description, icon_url FROM ministries WHERE slug = ?',
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ministry not found'
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Ministry by slug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ministry'
    });
  }
});

module.exports = router;