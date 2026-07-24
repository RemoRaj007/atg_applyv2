const crypto = require("crypto");
const argon2 = require("argon2");
const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const sanitizeUser = require("../../utils/sanitizeUser");
const { issueTokenPair, verifyRefreshToken } = require("../../utils/token.util");
const { activityLogger, securityLogger } = require("../../config/atg_logger");
const { sendEmail } = require("../notifications/email.service");
const { isValidEmail, validatePasswordStrength, isValidPhone } = require("../../utils/validators");

const register = async (data) => {
  const { email, name, password, phone, country, city, isCompany, companyName, companyWebsite, companyDescription } = data;
  
  if (!isValidEmail(email)) {
    throw ApiError.badRequest("Invalid email address format (e.g. user@example.com)");
  }

  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.isValid) {
    throw ApiError.badRequest(pwdCheck.message);
  }

  if (phone && !isValidPhone(phone)) {
    throw ApiError.badRequest("Invalid phone number format");
  }

  const existing = await prisma.user.findFirst({ where: { email, d_status: "active" } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const hashed = await argon2.hash(password);

  let companyId = null;
  let role = "candidate";

  if (isCompany) {
    const existingCompany = await prisma.company.findFirst({
      where: { OR: [{ email }, { name: companyName }], d_status: "active" },
    });
    if (existingCompany) {
      throw ApiError.conflict("A company with this name or email already exists");
    }

    const company = await prisma.company.create({
      data: {
        name: companyName,
        email: email,
        website: companyWebsite,
        description: companyDescription,
        status: "pending",
      },
    });
    companyId = company.id;
    role = "company";
    activityLogger.activity("Company registered", { companyId: company.id, name: companyName });
  }

  const user = await prisma.user.create({
    data: { email, name, password: hashed, phone, country, city, role, companyId },
  });

  activityLogger.activity("User registered", { userId: user.id, email: user.email, role: user.role });

  sendEmail({
    to: user.email,
    subject: "Welcome to ATG Apply",
    body: `Hi ${user.name}, your account has been created on the ${user.pkg} plan.`,
  }).catch(() => {});

  const tokens = issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findFirst({
    where: { email, d_status: "active" },
    include: { company: true },
  });
  if (!user) {
    securityLogger.security("Login failed: unknown email or inactive", { email });
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await argon2.verify(user.password, password);
  if (!valid) {
    securityLogger.security("Login failed: wrong password", { userId: user.id, email });
    throw ApiError.unauthorized("Invalid email or password");
  }

  securityLogger.security("Login succeeded", { userId: user.id, email });

  const tokens = issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.unauthorized("No refresh token provided");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findFirst({
    where: { id: decoded.id, d_status: "active" },
    include: { company: true },
  });
  if (!user) {
    throw ApiError.unauthorized("User no longer exists or is inactive");
  }

  const { accessToken } = issueTokenPair(user);
  return { user: sanitizeUser(user), accessToken };
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findFirst({
    where: { email, d_status: "active" },
  });
  if (!user) {
    // For security reasons, don't reveal that the user does not exist on the frontend,
    // but still send an email to notify them that a password reset was requested for an unregistered email.
    await sendEmail({
      to: email,
      subject: "Attempted password reset on ATG Apply",
      body: `Hello,\n\nYou (or someone else) requested a password reset for this email address. However, this email is not registered on ATG Apply.\n\nIf you do not have an account, please ignore this email.\n\nBest regards,\nATG Apply Team`,
    }).catch(() => {});
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000); // 1 hour from now

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",")[0] : "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your ATG Apply password",
    body: `Hello ${user.name},\n\nYou requested a password reset. Please click on the link below or copy and paste it into your browser to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nATG Apply Team`,
  });
};

const resetPassword = async (token, password) => {
  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.isValid) {
    throw ApiError.badRequest(pwdCheck.message);
  }

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: {
        gt: new Date(),
      },
      d_status: "active",
    },
  });

  if (!user) {
    throw ApiError.badRequest("Password reset token is invalid or has expired");
  }

  const hashed = await argon2.hash(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  activityLogger.activity("Password reset successful", { userId: user.id, email: user.email });
};

const googleLogin = async ({ idToken, credential }) => {
  const token = idToken || credential;
  if (!token) {
    throw ApiError.badRequest("Google ID token is required");
  }

  let googleUser;
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && clientId.trim()) {
      const { OAuth2Client } = require("google-auth-library");
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      googleUser = ticket.getPayload();
    } else {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error("Invalid Google token");
      }
      googleUser = await response.json();
    }
  } catch (err) {
    securityLogger.security("Google login failed: token verification failed", { error: err.message });
    throw ApiError.unauthorized("Google authentication failed. Invalid token.");
  }

  const { email, name, picture } = googleUser;

  if (!email) {
    throw ApiError.badRequest("Google account must have an email address");
  }

  let user = await prisma.user.findFirst({
    where: { email, d_status: "active" },
    include: { company: true },
  });

  if (!user) {
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashed = await argon2.hash(randomPassword);

    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        password: hashed,
        role: "candidate",
        pkg: "Trial",
        profilePhoto: picture || null,
      },
      include: { company: true },
    });
    activityLogger.activity("User registered via Google", { userId: user.id, email: user.email });
  } else if (!user.profilePhoto && picture) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { profilePhoto: picture },
      include: { company: true },
    });
  }

  securityLogger.security("Google login succeeded", { userId: user.id, email });
  const tokens = issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

module.exports = { register, login, refresh, googleLogin, forgotPassword, resetPassword };
