const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'docker-management-jwt-secret';

function auth(req, res, next) {
  // Get token from header, cookie, or query parameter
  const token = req.header('x-auth-token') ||
    (req.cookies && req.cookies.token) ||
    req.query.token;

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user from payload
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
  });
}

function writeAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'write') {
      return res.status(403).json({ error: 'Access denied. Write privileges required.' });
    }
    next();
  });
}

module.exports = {
  auth,
  adminAuth,
  writeAuth,
  JWT_SECRET
};
