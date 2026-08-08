const { rateLimit: expressRateLimit, MemoryStore } = require("express-rate-limit");
const { securityLogger } = require("../config/atg_logger");

// Thin wrapper over express-rate-limit, keeping the { name, windowMs, max }
// signature every call site already uses.
//
// This was a hand-rolled fixed-window limiter. It worked, but static analysis
// cannot recognise a bespoke implementation as rate limiting — CodeQL's
// js/missing-rate-limiting flagged routes that were in fact limited, which
// makes the rule useless for finding the routes that genuinely are not. Using
// the library the analysis models keeps the alert meaningful.
//
// The serverless caveat is unchanged: the default MemoryStore is per-process, so
// on Vercel the budget is per warm instance rather than global. That raises the
// cost of an attack without being an absolute cap. A shared store (Redis, or
// Postgres via rate-limit-postgresql) is the fix if a hard guarantee is needed.

// Every limiter's store, so tests can clear budgets between cases.
const stores = new Set();

const clientKey = (req) => {
  // Trust the platform's forwarding header only for its first hop; the rest is
  // caller-controlled and would otherwise let an attacker rotate their own key.
  const forwarded = req.headers["x-forwarded-for"];
  const first = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null;
  return first || req.ip || req.socket?.remoteAddress || "unknown";
};

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 10, name = "endpoint" } = {}) => {
  // Constructed here rather than left to the default so reset() has a reference
  // to it — the middleware object does not expose its store.
  const store = new MemoryStore();
  stores.add(store);

  return expressRateLimit({
    store,
    windowMs,
    limit: max,
    // draft-6 emits RateLimit-Limit / -Remaining / -Reset as separate headers,
    // which is what clients here already read.
    standardHeaders: "draft-6",
    legacyHeaders: false,
    keyGenerator: clientKey,
    // The library's IP validators assume its own key generator; ours is
    // deliberately stricter about x-forwarded-for, so they only produce noise.
    validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false, trustProxy: false },
    handler: (req, res, _next, options) => {
      securityLogger.security("Rate limit exceeded", { path: req.originalUrl, name });
      res.setHeader("Retry-After", String(Math.ceil(options.windowMs / 1000)));
      res.status(429).json({
        status: false,
        message: "Too many requests. Please wait a few minutes and try again.",
      });
    },
  });
};

// Exposed for tests, which would otherwise inherit a spent budget between cases.
rateLimit.reset = () => {
  for (const store of stores) {
    if (typeof store.resetAll === "function") store.resetAll();
  }
};

module.exports = rateLimit;
