const tokenUtil = require("../../utils/token.util");
const { securityLogger } = require("../../config/atg_logger");

function parseAuthToken(requestHeaders) {
  const headerValue = requestHeaders["authorization"] || "";
  const match = /^Bearer\s+(.+)$/i.exec(headerValue);
  return match ? match[1] : null;
}

function normalizeRole(rawRole) {
  return String(rawRole || "").toLowerCase() === "customer" ? "candidate" : rawRole;
}

module.exports = function authenticate(req, res, next) {
  const jwtToken = parseAuthToken(req.headers);

  if (!jwtToken) {
    return res.status(401).json({ status: false, message: "Access denied. No token provided" });
  }

  try {
    const payload = tokenUtil.verifyAccessToken(jwtToken);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: normalizeRole(payload.role),
      companyId: payload.companyId,
    };
    return next();
  } catch (authError) {
    securityLogger.security("Authentication failed", { path: req.originalUrl, reason: authError.name });

    const isExpired = authError.name === "TokenExpiredError";
    const errorMessage = isExpired ? "Token has expired" : "Invalid token";
    return res.status(401).json({ status: false, message: errorMessage });
  }
};
