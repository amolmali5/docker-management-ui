const express = require('express');
const { db } = require('../db');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/settings
// @desc    Get application settings
// @access  Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    res.json(db.get('settings').value());
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/settings
// @desc    Update application settings
// @access  Admin
router.put('/', adminAuth, async (req, res) => {
  try {
    const { defaultRefreshRate, defaultTheme } = req.body;

    // Update settings
    const updates = {};

    if (defaultRefreshRate !== undefined) {
      updates.defaultRefreshRate = defaultRefreshRate;
    }

    if (defaultTheme !== undefined) {
      updates.defaultTheme = defaultTheme;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      db.get('settings').assign(updates).write();
    }

    res.json(db.get('settings').value());
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
