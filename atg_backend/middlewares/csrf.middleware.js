const { isAllowedOrigin } = require("../config/origins");
const { securityLogger } = require("../config/atg_logger");
const ApiError = require("../utils/ApiError");

// CSRF defence for the endpoints that authenticate with the refresh *cookie*
// rather than an Authorization header.
//
// Most of this API is not exposed to CSRF: every other state-changing route
// authenticates with `Authorization: Bearer <accessToken>`, and a browser never
// attaches that header to a cross-site request on an attacker's behalf. The
// refresh cookie is different. It is SameSite=None in production — it has to be,
// because the frontend (Cloudflare) and this API (Vercel) are different sites —
// so the browser *does* send it cross-site, and /auth/refresh and /auth/logout
// act on it with no other credential.
//
// Origin checking rather than a synchroniser token: a token would need the
// frontend to fetch and echo it, and the thing being protected is exactly the
// call that bootstraps a session, so there is no authenticated context to hand a
// token out from yet. Browsers always send Origin on cross-origin requests and
// on same-origin POSTs, and it cannot be forged by page JavaScript.
//
// Requests with no Origin at all are allowed through: non-browser callers (curl,
// health probes, server-to-server) send none, and they are not the CSRF threat
// model — an attacker's leverage is a *browser* the victim is logged into, and
// browsers always send it here. Referer is accepted as a fallback for the rare
// privacy tool that strips Origin.
const originOf = (req) => {
  const origin = req.headers.origin;
  if (origin) return origin;

  const referer = req.headers.referer;
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const requireTrustedOrigin = (req, res, next) => {
  const origin = originOf(req);

  // No Origin and no Referer: not a browser-driven cross-site request.
  if (!origin) return next();

  if (isAllowedOrigin(origin)) return next();

  securityLogger.security("Blocked a cookie-authenticated request from an untrusted origin", {
    path: req.originalUrl,
    origin,
  });
  return next(ApiError.forbidden("Request origin is not allowed"));
};

module.exports = requireTrustedOrigin;
