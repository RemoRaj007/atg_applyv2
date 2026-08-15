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
const { verifyPassword } = require("../../utils/passwordHash");
const { logNotifyFailure } = require("../../utils/fireAndForget");

// Shared with forgotPassword's resetLink construction.
const frontendOrigin = () =>
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",")[0] : "http://localhost:5173";

const verificationLink = (token) => `${frontendOrigin()}/verify-email?token=${token}`;

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

  // Not filtered by d_status: the email column is globally unique, so a
  // soft-deleted account still holds the address. Checking only active rows let
  // registration past this point and into the unique constraint, which surfaced
  // as a 500 rather than something the applicant could act on. Same reasoning as
  // the deactivated-account branch in socialLogin.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict(
      existing.d_status === "active"
        ? "An account with this email already exists"
        : "An account for this email address has been deactivated. Contact support to restore it."
    );
  }

  const hashed = await argon2.hash(password);

  // Local accounts start unverified; SSO accounts are created directly with
  // emailVerified true in googleLogin/microsoftLogin, since the identity
  // provider already attested the address. See "Login gating" below.
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

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
        emailVerificationToken,
        emailVerificationExpires,
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
  }).catch(logNotifyFailure("notification"));

  sendTemplatedEmail({
    to: user.email,
    templateKey: "email_verification",
    vars: { name: user.name, email: user.email, verifyLink: verificationLink(emailVerificationToken) },
    fallback: {
      subject: "Verify your ATG Apply email address",
      body: `Hi ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink(emailVerificationToken)}\n\nThe link expires in 24 hours.\n\nBest regards,\nATG Apply Team`,
    },
  }).catch(logNotifyFailure("notification"));

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

  // Not argon2.verify directly: it throws on a stored value it cannot parse,
  // which reached the error handler as a 500 and made a single unusable row look
  // like the API was down. See utils/passwordHash.js.
  const valid = await verifyPassword(user.password, password, { userId: user.id });
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
    }).catch(logNotifyFailure("notification"));
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

// Verification does not gate login (see the comment on `register`'s token
// generation) — it only flips `emailVerified` and clears the token. A future
// change that wants to enforce verification for new signups can check that
// flag in `login` without touching this function.
const verifyEmail = async (token) => {
  if (!token) {
    throw ApiError.badRequest("Verification token is required");
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() },
      d_status: "active",
    },
  });

  if (!user) {
    throw ApiError.badRequest("This verification link is invalid or has expired");
  }

  if (user.emailVerified) {
    // Already verified — most likely the link was opened twice (email client
    // prefetch, or the user clicking it again). Not an error.
    return { alreadyVerified: true };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  activityLogger.activity("Email verified", { userId: user.id, email: user.email });
  return { alreadyVerified: false };
};

const resendVerificationEmail = async (email) => {
  const user = await prisma.user.findFirst({ where: { email, d_status: "active" } });

  // Same opaque-response shape as forgotPassword: do not reveal whether the
  // address is registered, or whether it is already verified.
  if (!user || user.emailVerified) {
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: token, emailVerificationExpires: expires },
  });

  await sendTemplatedEmail({
    to: user.email,
    templateKey: "email_verification",
    vars: { name: user.name, email: user.email, verifyLink: verificationLink(token) },
    fallback: {
      subject: "Verify your ATG Apply email address",
      body: `Hi ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink(token)}\n\nThe link expires in 24 hours.\n\nBest regards,\nATG Apply Team`,
    },
  });
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

module.exports = {
  register,
  login,
  refresh,
  googleLogin,
  microsoftLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
};
