// Startup validation for the environment variables authentication cannot work
// without.
//
// Until now a deploy missing JWT_SECRET looked exactly like a deploy with a bad
// password: `issueTokenPair` threw *after* the credential check, the error
// handler masked the message outside development ("Internal server error"), and
// the frontend rendered it as "Failed to log in". Nothing anywhere said which
// variable was missing, so a misconfigured deploy was indistinguishable from a
// user typo.
//
// Checking at module load makes the failure loud once, at boot, and
// `authConfigStatus()` lets /api/health report it without ever echoing a secret.
const { systemLogger } = require("./atg_logger");

// DATABASE_URL is included because every login begins with a user lookup: with
// it unset the request fails before the password is even hashed, and it fails
// the same opaque way.
const REQUIRED_AUTH_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];

const missingAuthEnv = () => REQUIRED_AUTH_ENV.filter((name) => !process.env[name]);

// Reported by /api/health. Names only — never values, and never a partial value:
// this endpoint is unauthenticated.
const authConfigStatus = () => {
  const missing = missingAuthEnv();
  return missing.length === 0
    ? { status: "ok" }
    : { status: "error", missing };
};

// Logged rather than thrown. Throwing here would take down the whole API,
// including /api/health — the one endpoint that could tell an operator what is
// wrong. Requests that need the missing variable still fail; everything else
// keeps serving.
const assertAuthConfig = () => {
  const missing = missingAuthEnv();
  if (missing.length > 0) {
    systemLogger.error(
      `Authentication is misconfigured: ${missing.join(", ")} not set. ` +
        "Login, registration and token refresh will fail until these are present in the deploy environment.",
      { missing }
    );
  }
  return missing;
};

module.exports = { assertAuthConfig, authConfigStatus, missingAuthEnv, REQUIRED_AUTH_ENV };
