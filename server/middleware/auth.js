const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'docker-management-jwt-secret';

function auth(req, res, next) {
  // Get token from various possible sources
  let token = req.header('x-auth-token') ||
    (req.cookies && req.cookies.token) ||
    req.query.token;

  // Also check Authorization header (Bearer token)
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Check if no token
  if (!token) {
    //  console.log('Auth middleware: No token found in request', {
    //   url: req.originalUrl,
    //   method: req.method,
    //   headers: {
    //     'x-auth-token': req.header('x-auth-token'),
    //     'authorization': req.header('authorization'),
    //     'cookie': req.header('cookie')
    //   },
    //   cookies: req.cookies,
    //   query: req.query
    // });
    return res.status(401).json({
      error: 'No token, authorization denied',
      details: 'Authentication token is missing. Please log in again.'
    });
  }

  // Log the token for debugging (don't show the full token)
  // console.log(`Auth middleware: Token found (starts with ${token.substring(0, 10)}...)`);



  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Log successful verification
    // console.log(`Auth middleware: Token verified successfully for user ID ${decoded.id}`);

    // Add user from payload
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', {
      error: err.message,
      name: err.name,
      stack: err.stack,
      token: token.substring(0, 10) + '...' // Only log part of the token for security
    });

    // Provide more specific error messages
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }

    res.status(401).json({
      error: 'Token is not valid',
      code: 'INVALID_TOKEN',
      details: err.message
    });
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
