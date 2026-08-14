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

function toRequestUser(payload) {
  return {
    id: payload.id,
    email: payload.email,
    role: normalizeRole(payload.role),
    companyId: payload.companyId,
  };
}

function authenticate(req, res, next) {
  const jwtToken = parseAuthToken(req.headers);

  if (!jwtToken) {
    return res.status(401).json({ status: false, message: "Access denied. No token provided" });
  }

  try {
    req.user = toRequestUser(tokenUtil.verifyAccessToken(jwtToken));
    return next();
  } catch (authError) {
    securityLogger.security("Authentication failed", { path: req.originalUrl, reason: authError.name });

    const isExpired = authError.name === "TokenExpiredError";
    const errorMessage = isExpired ? "Token has expired" : "Invalid token";
    return res.status(401).json({ status: false, message: errorMessage });
  }
}

// For endpoints that are readable anonymously but tailor their response when the
// caller happens to be signed in. A missing or unusable token degrades to
// anonymous rather than failing the request — which is what `authenticate`
// cannot do, since it answers 401 itself instead of calling next().
function optionalAuthenticate(req, res, next) {
  const jwtToken = parseAuthToken(req.headers);
  if (!jwtToken) return next();

  try {
    req.user = toRequestUser(tokenUtil.verifyAccessToken(jwtToken));
  } catch {
    // Deliberately anonymous: the route does not require identity.
  }
  return next();
}

module.exports = authenticate;
module.exports.optionalAuthenticate = optionalAuthenticate;
