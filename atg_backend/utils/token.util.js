const jwt = require("jsonwebtoken");

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

const issueTokenPair = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
    requireSecret("JWT_SECRET"),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    requireSecret("JWT_REFRESH_SECRET"),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => jwt.verify(token, requireSecret("JWT_SECRET"));

const verifyRefreshToken = (token) => jwt.verify(token, requireSecret("JWT_REFRESH_SECRET"));

module.exports = { issueTokenPair, verifyAccessToken, verifyRefreshToken };
