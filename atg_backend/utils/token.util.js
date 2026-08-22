const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Without these, jsonwebtoken throws "secretOrPrivateKey must have a value",
// which surfaces as an opaque 500 on login/registration and gives no hint that
// an environment variable is missing. Name the variable instead.
const requireSecret = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — authentication cannot issue or verify tokens`);
  }
  return value;
};

// The refresh token's jti is the rotation/revocation handle: the caller
// persists it as the user's refreshTokenId, and a later /refresh is only
// honored if the presented token's jti still matches — see auth.service.js.
const issueTokenPair = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
    requireSecret("JWT_SECRET"),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

  const refreshJti = crypto.randomBytes(24).toString("hex");
  const refreshToken = jwt.sign(
    { id: user.id, jti: refreshJti },
    requireSecret("JWT_REFRESH_SECRET"),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken, refreshJti };
};

const verifyAccessToken = (token) =>
  jwt.verify(token, requireSecret("JWT_SECRET"), { algorithms: ["HS256"] });

const verifyRefreshToken = (token) =>
  jwt.verify(token, requireSecret("JWT_REFRESH_SECRET"), { algorithms: ["HS256"] });

module.exports = { issueTokenPair, verifyAccessToken, verifyRefreshToken };
