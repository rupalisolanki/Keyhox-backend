// Middleware to verify JWT token on protected routes.

const jwt = require('jsonwebtoken');

// @ts-ignore
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = /** @type {import('jsonwebtoken').JwtPayload} */ (jwt.verify(token, /** @type {string} */ (process.env.JWT_SECRET)));
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;