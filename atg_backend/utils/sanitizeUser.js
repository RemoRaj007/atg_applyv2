// Strips every credential-bearing field before a user object crosses the API
// boundary. resetPasswordToken is live single-use credential material — leaking
// it lets a reader complete a password reset for that account.
const sanitizeUser = (user) => {
  if (!user) return user;
  const { password, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  return safe;
};

module.exports = sanitizeUser;
