const { securityLogger } = require("../config/atg_logger");

// Fixed-window limiter for the endpoints an attacker can hammer without an
// account: credential stuffing on login, account enumeration and mail flooding
// through forgot-password, and the unauthenticated contact form.
//
// Deliberately in-process and dependency-free. On Vercel that means the budget
// is per warm instance rather than global, so it raises the cost of an attack
// without being an absolute cap — a shared store (Redis/Postgres) is the fix if
// the platform ever needs a hard guarantee. It is still worth having: before
// this, one client could try passwords as fast as the network allowed.
const buckets = new Map();

// Bound the map so a spray of unique IPs cannot grow it without limit.
const MAX_TRACKED_CLIENTS = 10_000;

const clientKey = (req) => {
  // Trust the platform's forwarding header only for its first hop; the rest is
  // caller-controlled and would otherwise let an attacker rotate their own key.
  const forwarded = req.headers["x-forwarded-for"];
  const first = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null;
  return first || req.ip || req.socket?.remoteAddress || "unknown";
};

const sweep = (now) => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, name = "endpoint" } = {}) => (req, res, next) => {
  const now = Date.now();
  const key = `${name}:${clientKey(req)}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_CLIENTS) sweep(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(0, max - bucket.count);
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.ceil((bucket.resetAt - now) / 1000)));

  if (bucket.count > max) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    securityLogger.security("Rate limit exceeded", { path: req.originalUrl, name });
    return res.status(429).json({
      status: false,
      message: "Too many requests. Please wait a few minutes and try again.",
    });
  }

  return next();
};

// Exposed for tests, which would otherwise inherit a spent budget between cases.
rateLimit.reset = () => buckets.clear();

module.exports = rateLimit;
