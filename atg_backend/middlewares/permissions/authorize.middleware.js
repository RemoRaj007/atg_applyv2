const { securityLogger } = require("../../config/atg_logger");

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    // The role matrix belongs in the logs, not in the response: echoing the
    // caller's role and the allowed set back to them hands an attacker a map of
    // the permission model one 403 at a time.
    securityLogger.security("Authorization denied", {
      path: req.originalUrl,
      userId: req.user?.id,
      role: req.user?.role,
      allowedRoles,
    });
    return res.status(403).json({ status: false, message: "Access denied: insufficient permissions" });
  }

  return next();
};

module.exports = authorize;
