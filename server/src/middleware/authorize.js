// server/src/middleware/authorize.js

/**
 * Middleware factory: Role-based access control.
 * Usage: authorize('ADMIN', 'MANAGER')
 * Returns 403 if the authenticated user's role is not in the allowed list.
 * Must be used AFTER the authenticate middleware.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = authorize;
