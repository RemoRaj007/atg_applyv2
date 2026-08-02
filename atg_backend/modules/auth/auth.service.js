const crypto = require("crypto");
const argon2 = require("argon2");
const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const sanitizeUser = require("../../utils/sanitizeUser");
const { issueTokenPair, verifyRefreshToken } = require("../../utils/token.util");
const { activityLogger, securityLogger } = require("../../config/atg_logger");
const { sendTemplatedEmail } = require("../notifications/email.service");
const { isValidEmail, validatePasswordStrength, isValidPhone } = require("../../utils/validators");
const { verifyIdentityToken } = require("./federated-identity.service");

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

  if (isCompany) {
    const existingCompany = await prisma.company.findFirst({
      where: { OR: [{ email }, { name: companyName }], d_status: "active" },
    });
    if (existingCompany) {
      throw ApiError.conflict("A company with this name or email already exists");
    }
  }

  // Both rows or neither. Creating the company and the user as separate writes
  // meant a failure on the second left an orphan `pending` company behind — and
  // the duplicate-company check above then rejected every retry, so the applicant
  // could never register with that name or email again.
  const { user, company } = await prisma.$transaction(async (tx) => {
    let createdCompany = null;

    if (isCompany) {
      createdCompany = await tx.company.create({
        data: {
          name: companyName,
          email: email,
          website: companyWebsite,
          description: companyDescription,
          status: "pending",
        },
      });
    }

    const createdUser = await tx.user.create({
      data: {
        email,
        name,
        password: hashed,
        phone,
        country,
        city,
        role: isCompany ? "company" : "candidate",
        companyId: createdCompany ? createdCompany.id : null,
      },
    });

    return { user: createdUser, company: createdCompany };
  });

  if (company) {
    activityLogger.activity("Company registered", { companyId: company.id, name: companyName });
  }

  activityLogger.activity("User registered", { userId: user.id, email: user.email, role: user.role });

  sendTemplatedEmail({
    to: user.email,
    templateKey: "welcome",
    vars: { name: user.name, email: user.email, plan: user.pkg },
    fallback: {
      subject: "Welcome to ATG Apply",
      body: `Hi ${user.name}, your account has been created on the ${user.pkg} plan.`,
    },
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

  // SSO-only accounts have no password. argon2.verify throws on a null hash, so
  // reject before that and keep the same opaque message — telling the caller
  // "this address uses Google" would confirm the account exists.
  if (!user.password) {
    securityLogger.security("Login failed: password login on an SSO-only account", {
      userId: user.id,
      provider: user.provider,
    });
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
    await sendTemplatedEmail({
      to: email,
      templateKey: "password_reset_unknown",
      vars: { email },
      fallback: {
        subject: "Attempted password reset on ATG Apply",
        body: `Hello,\n\nYou (or someone else) requested a password reset for this email address. However, this email is not registered on ATG Apply.\n\nIf you do not have an account, please ignore this email.\n\nBest regards,\nATG Apply Team`,
      },
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

  await sendTemplatedEmail({
    to: user.email,
    templateKey: "password_reset",
    vars: { name: user.name, email: user.email, resetLink },
    fallback: {
      subject: "Reset your ATG Apply password",
      body: `Hello ${user.name},\n\nYou requested a password reset. Please click on the link below or copy and paste it into your browser to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nATG Apply Team`,
    },
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

// Signs a user in from an already-verified federated identity. Shared by every
// provider — only the token verification differs between them.
//
// Resolution order matters:
//   1. (provider, externalId) — the IdP's stable subject. Survives the user
//      changing their email address at the IdP.
//   2. verified email — links a first-time social sign-in to the existing
//      password account for that address. Only ever attempted when the IdP
//      says the address is verified, otherwise anyone able to assert an
//      arbitrary address at an IdP could take over a local account.
const socialLogin = async (provider, { idToken, credential }) => {
  const identity = await verifyIdentityToken(provider, idToken || credential);
  const { externalId, email, emailVerified, name, picture } = identity;

  let user = await prisma.user.findFirst({
    where: { provider, externalId, d_status: "active" },
    include: { company: true },
  });

  if (!user && emailVerified) {
    user = await prisma.user.findFirst({
      where: { email, d_status: "active" },
      include: { company: true },
    });

    if (user) {
      // First social sign-in for an existing account — record the link so
      // subsequent logins resolve by externalId.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider,
          externalId,
          emailVerified: true,
          ...(user.profilePhoto || !picture ? {} : { profilePhoto: picture }),
        },
        include: { company: true },
      });
      securityLogger.security(`Linked ${provider} identity to existing account`, {
        userId: user.id,
        email,
      });
    }
  }

  if (!user) {
    if (!emailVerified) {
      // No account to link and no verified address: refusing is the only safe
      // option, since we would otherwise create an account for an address the
      // signer has not proven they control.
      securityLogger.security(`${provider} login rejected: unverified email`, { email });
      throw ApiError.unauthorized(
        `Your ${provider} account's email address is not verified. Verify it with ${provider}, or sign up with a password.`
      );
    }

    // A soft-deleted user still holds the address (email is globally unique but
    // every lookup filters d_status), so creating would hit the constraint.
    const conflicting = await prisma.user.findUnique({ where: { email } });
    if (conflicting) {
      securityLogger.security(`${provider} login blocked by a deactivated account`, { email });
      throw ApiError.forbidden(
        "An account for this email address has been deactivated. Contact support to restore it."
      );
    }

    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        // No password: this account signs in through the provider only. It can
        // still gain one later via the password-reset flow.
        password: null,
        role: "candidate",
        pkg: "Trial",
        profilePhoto: picture || null,
        provider,
        externalId,
        emailVerified: true,
      },
      include: { company: true },
    });
    activityLogger.activity(`User registered via ${provider}`, { userId: user.id, email: user.email });
  } else if (!user.profilePhoto && picture) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { profilePhoto: picture },
      include: { company: true },
    });
  }

  securityLogger.security(`${provider} login succeeded`, { userId: user.id, email });
  const tokens = issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

const googleLogin = (payload) => socialLogin("google", payload);
const microsoftLogin = (payload) => socialLogin("microsoft", payload);

module.exports = { register, login, refresh, googleLogin, microsoftLogin, forgotPassword, resetPassword };
