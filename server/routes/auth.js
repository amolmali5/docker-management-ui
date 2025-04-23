const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

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

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    const { username, email, password } = req.body;

    // Simple validation
    if (!username || !email || !password) {
      console.log('Missing registration fields:', { username: !!username, email: !!email, password: !!password });
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Check for existing user
    const existingUserByUsername = db.get('users').find({ username }).value();
    const existingUserByEmail = db.get('users').find({ email }).value();

    console.log('Existing user check:', {
      existingUserByUsername: !!existingUserByUsername,
      existingUserByEmail: !!existingUserByEmail
    });

    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    if (existingUserByEmail) {
      return res.status(400).json({ error: 'Email already exists' });
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
      role: users.length === 0 ? 'admin' : 'read', // First user is admin, others are read-only by default
      createdAt: new Date().toISOString(),
      settings: {
        theme: db.get('settings.defaultTheme').value(),
        refreshRate: db.get('settings.defaultRefreshRate').value()
      }
    };

    // Add to users array
    db.get('users').push(newUser).write();

    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production'
    });

    // Return user info and token
    res.json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        settings: newUser.settings
      }
    });
  } catch (err) {
    console.error('Error in register:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password: '***' });

    // Simple validation
    if (!username || !password) {
      console.log('Missing fields');
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    // Check for existing user
    const user = db.get('users').find({ username }).value();
    console.log('User found:', user ? { id: user.id, username: user.username, role: user.role } : 'No user found');

    if (!user) {
      console.log('User not found');
      return res.status(400).json({ error: 'Invalid credentials - username not found' });
    }

    // Always use the password from the database for authentication
    let isMatch = false;

    try {
      // Special case for admin user with default password
      if (user.username === 'admin' && password === 'admin' && user.firstLogin) {
        // Allow login with default password for admin on first login
        isMatch = true;
        console.log('Admin logging in with default password on first login');
      } else {
        // Compare the provided password with the hashed password in the database
        isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
      }
    } catch (err) {
      console.error('Error comparing passwords:', err);
      isMatch = false;
    }

    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ error: 'Invalid credentials - password incorrect' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production'
    });

    // Return user info and token
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstLogin: user.firstLogin || false,
        settings: user.settings
      }
    });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = db.get('users').find({ id: req.user.id }).value();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin || false,
      settings: user.settings
    });
  } catch (err) {
    console.error('Error getting user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token');
    res.json({ success: true });
  } catch (err) {
    console.error('Error in logout:', err);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Simple validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please enter all fields' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Get user from database
    const user = db.get('users').find({ id: req.user.id }).value();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Create salt & hash for new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('New password hash:', hashedPassword);

    // Update user password and firstLogin flag
    // For admin user, we'll keep the firstLogin flag as false
    // but we won't prevent them from logging in with the default password
    db.get('users')
      .find({ id: req.user.id })
      .assign({
        password: hashedPassword,
        firstLogin: false
      })
      .write();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
