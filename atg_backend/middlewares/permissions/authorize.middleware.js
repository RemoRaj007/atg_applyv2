const { securityLogger } = require("../../config/atg_logger");

const authorize = (...allowedRoles) => (req, res, next) => {
  const { systemLogger } = require("../../config/atg_logger");
  systemLogger.info(`AUTHORIZE CHECK: URL=${req.originalUrl}, USER=${JSON.stringify(req.user)}, ALLOWED=${allowedRoles}`);

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    securityLogger.security("Authorization denied", {
      path: req.originalUrl,
      userId: req.user?.id,
      role: req.user?.role,
      allowedRoles,
    });
    return res.status(403).json({ status: false, message: `Access denied: insufficient permissions. Role '${req.user?.role}' is not in [${allowedRoles.join(",")}]` });
  }
  
  return next();
};

module.exports = authorize;
