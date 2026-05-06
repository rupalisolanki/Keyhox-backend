// Middleware to restrict routes to specific roles.

const requireRole = (/** @type {string[]} */ ...roles) => {
  // @ts-ignore
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = requireRole;