// Middleware to verify JWT token from httpOnly cookie.

const jwt = require('jsonwebtoken');

// @ts-ignore
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = /** @type {import('jsonwebtoken').JwtPayload} */ (jwt.verify(token, /** @type {string} */ (process.env.JWT_SECRET)));
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
