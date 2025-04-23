const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { auth, adminAuth } = require('../middleware/auth');

// Password validation function
const validatePassword = (password) => {
  // Check all requirements
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNumberOrSpecial = hasNumbers || hasSpecialChars;

  // Determine if password is valid
  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumberOrSpecial;

  // Return validation result
  if (!isValid) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters and include uppercase, lowercase, and a number or special character'
    };
  }

  return { isValid: true };
};

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    // Return users without passwords
    const users = db.get('users').value().map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));

    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin or Self
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user is requesting their own data or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = db.get('users').find({ id: userId }).value();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user without password
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      settings: user.settings
    });
  } catch (err) {
    console.error(`Error getting user ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Admin or Self
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user is updating their own data or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = db.get('users').find({ id: userId }).value();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { username, email, password, role, settings } = req.body;

    // Update fields if provided
    if (username) {
      // Check if username is already taken by another user
      const existingUser = db.get('users')
        .find(u => u.id !== userId && u.username === username)
        .value();

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      db.get('users').find({ id: userId }).assign({ username }).write();
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = db.get('users')
        .find(u => u.id !== userId && u.email === email)
        .value();

      if (existingUser) {
        return res.status(400).json({ error: 'Email already taken' });
      }

      db.get('users').find({ id: userId }).assign({ email }).write();
    }

    if (password) {
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: passwordValidation.error });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      db.get('users').find({ id: userId }).assign({ password: hashedPassword }).write();
    }

    // Only admin can change roles
    if (role && req.user.role === 'admin') {
      db.get('users').find({ id: userId }).assign({ role }).write();
    }

    if (settings) {
      const currentSettings = db.get('users').find({ id: userId }).get('settings').value() || {};
      db.get('users').find({ id: userId }).set('settings', { ...currentSettings, ...settings }).write();
    }

    // Get updated user
    const updatedUser = db.get('users').find({ id: userId }).value();

    // Return updated user without password
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      settings: updatedUser.settings
    });
  } catch (err) {
    console.error(`Error updating user ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create a new user with specified role
// @access  Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Simple validation
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    // Validate role
    if (!['admin', 'read', 'write'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, read, or write' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check for existing user
    const existingUser = db.get('users')
      .find(user => user.username === username || user.email === email)
      .value();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create salt & hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get new user ID
    const users = db.get('users').value();
    const newId = users.length > 0
      ? Math.max(...users.map(user => user.id)) + 1
      : 1;

    // Create new user
    const newUser = {
      id: newId,
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      settings: {
        theme: db.get('settings.defaultTheme').value() || 'light',
        refreshRate: db.get('settings.defaultRefreshRate').value() || 10000
      }
    };

    // Add to users array
    db.get('users').push(newUser).write();

    // Return created user without password
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting the last admin
    const adminUsers = db.get('users').filter({ role: 'admin' }).value();
    const userToDelete = db.get('users').find({ id: userId }).value();

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userToDelete.role === 'admin' && adminUsers.length === 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }

    // Remove user
    db.get('users').remove({ id: userId }).write();

    res.json({ success: true });
  } catch (err) {
    console.error(`Error deleting user ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
