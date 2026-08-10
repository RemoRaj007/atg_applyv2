const argon2 = require("argon2");
const { securityLogger } = require("../config/atg_logger");

// `argon2.verify` does not merely return false for a stored value it cannot
// parse — it *throws*. A bcrypt hash is fine (it parses, and returns false), but
// a plaintext password, an empty string, or a truncated hash raises
// "pchstr must contain a $ as first char". Every call site treated that as
// impossible, so the throw travelled to the error handler and became a 500:
//
//   POST /auth/login        → 500 "Internal server error" (looks like an outage)
//   PUT  /users/me/password → 500 on the *old* password check
//
// A row like that is not exotic. It is what you get from a password written
// straight into the database, a partial import, or a hash truncated by a column
// narrower than the 97 characters argon2id needs.
//
// The account cannot authenticate either way — the point is that it should fail
// as "wrong password", not as a server error, and it should say so in the log.
const verifyPassword = async (storedHash, plainPassword, context = {}) => {
  if (!storedHash) return false;

  try {
    return await argon2.verify(storedHash, plainPassword);
  } catch (err) {
    // Deliberately never logs the value: it may be a plaintext password.
    securityLogger.security("Stored password could not be parsed as a hash", {
      ...context,
      reason: err.message,
    });
    return false;
  }
};

// True when the stored value is something argon2 can actually check. Callers
// that want to tell the user *why* they are stuck — change-password, which can
// otherwise only say "incorrect old password" forever — use this to send them to
// the reset flow instead.
const isVerifiableHash = (storedHash) =>
  typeof storedHash === "string" && storedHash.startsWith("$argon2");

module.exports = { verifyPassword, isVerifiableHash };
