const argon2 = require("argon2");
const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const sanitizeUser = require("../../utils/sanitizeUser");
const { activityLogger, securityLogger } = require("../../config/atg_logger");
const { isValidEmail, validatePasswordStrength, isValidPhone } = require("../../utils/validators");
// Aliased: this module already exports a `verifyPassword` of its own (the
// /me/verify-password handler), which shadowed the import outright.
const { verifyPassword: checkPassword, isVerifiableHash } = require("../../utils/passwordHash");

const list = async () => {
  const users = await prisma.user.findMany({ where: { d_status: "active" }, orderBy: { createdAt: "desc" } });
  return users.map(sanitizeUser);
};

const getById = async (id) => {
  const user = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitizeUser(user);
};

// Roles an operator is allowed to touch. Operators sit below admins, so letting
// them mint or edit admin/operator accounts would make the distinction
// meaningless: an operator could create an admin, or reset a sitting admin's
// password, and take over the platform.
const OPERATOR_MANAGEABLE_ROLES = ["candidate", "company", "visitor"];

const assertOperatorMayManage = (requester, targetRole, action) => {
  if (requester?.role !== "operator") return;
  if (!OPERATOR_MANAGEABLE_ROLES.includes(targetRole)) {
    securityLogger.security(`Operator blocked from ${action} a privileged account`, {
      operatorId: requester.id,
      targetRole,
    });
    throw ApiError.forbidden("Operators cannot manage admin or operator accounts");
  }
};

const create = async (data, requester) => {
  assertOperatorMayManage(requester, data.role || "candidate", "creating");

  if (!isValidEmail(data.email)) {
    throw ApiError.badRequest("Invalid email address format (e.g. user@example.com)");
  }
  if (data.password) {
    const pwdCheck = validatePasswordStrength(data.password);
    if (!pwdCheck.isValid) throw ApiError.badRequest(pwdCheck.message);
  }
  if (data.phone && !isValidPhone(data.phone)) {
    throw ApiError.badRequest("Invalid phone number format");
  }

  // `email` is globally unique, but every lookup in this codebase filters on
  // d_status — so a soft-deleted account still holds its address while being
  // invisible to the check. Testing only for an active row meant the create
  // below hit the unique constraint and answered 500, with a message the admin
  // could do nothing about. Look at the address itself and say which case it is.
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict(
      existing.d_status === "active"
        ? "An account with this email already exists"
        : "A deactivated account already uses this email. Restore it instead of creating a new one."
    );
  }

  const password = await argon2.hash(data.password);
  const user = await prisma.user.create({ data: { ...data, password } });
  activityLogger.activity("User created", { userId: user.id, email: user.email, role: user.role });
  return sanitizeUser(user);
};

// requester may update their own profile; admins may update anyone; operators
// may update the non-privileged accounts they support, but may not change roles
// or reset another account's password.
const update = async (id, data, requester) => {
  const target = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!target) throw ApiError.notFound("User not found");

  const isSelf = requester.id === id;
  if (requester.role !== "admin" && requester.role !== "operator" && !isSelf) {
    throw ApiError.forbidden("You can only update your own profile");
  }

  if (requester.role === "operator" && !isSelf) {
    assertOperatorMayManage(requester, target.role, "editing");

    if (data.role !== undefined) {
      securityLogger.security("Operator blocked from changing a role", {
        operatorId: requester.id,
        targetId: id,
        attemptedRole: data.role,
      });
      throw ApiError.forbidden("Only an admin can change a user's role");
    }

    if (data.password !== undefined) {
      securityLogger.security("Operator blocked from resetting another account's password", {
        operatorId: requester.id,
        targetId: id,
      });
      throw ApiError.forbidden("Only an admin can set another user's password");
    }
  }

  // Admins carry the broader schema, which permits setting someone else's
  // password. That must not become a way to reset your *own* password without
  // proving you know the current one — PUT /me/password exists for that.
  if (isSelf && data.password !== undefined) {
    securityLogger.security("Password change attempted through the profile endpoint", {
      userId: requester.id,
    });
    throw ApiError.forbidden("Use the change-password endpoint to change your own password");
  }

  const updateData = { ...data };
  if (updateData.email && !isValidEmail(updateData.email)) {
    throw ApiError.badRequest("Invalid email address format (e.g. user@example.com)");
  }
  if (updateData.phone && !isValidPhone(updateData.phone)) {
    throw ApiError.badRequest("Invalid phone number format");
  }
  if (updateData.password) {
    const pwdCheck = validatePasswordStrength(updateData.password);
    if (!pwdCheck.isValid) throw ApiError.badRequest(pwdCheck.message);
    updateData.password = await argon2.hash(updateData.password);
  }

  const user = await prisma.user.update({ where: { id }, data: updateData });
  activityLogger.activity("User updated", { userId: user.id, updatedBy: requester.id, fields: Object.keys(data) });
  return sanitizeUser(user);
};

const remove = async (id, requester) => {
  const target = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!target) throw ApiError.notFound("User not found");

  assertOperatorMayManage(requester, target.role, "deleting");

  const dependentApplications = await prisma.candidateApplication.count({
    where: { OR: [{ userId: id }, { staffId: id }], d_status: "active" },
  });
  if (dependentApplications > 0) {
    throw ApiError.badRequest("Cannot delete a user with existing active applications");
  }

  await prisma.user.update({ where: { id }, data: { d_status: "inactive" } });
  activityLogger.activity("User deleted", { userId: id });
};

const exportAll = async (requester) => {
  const where = { d_status: "active" };
  if (requester.role === "operator") {
    where.role = "candidate";
    where.applications = {
      some: {
        staffId: requester.id,
        d_status: "active"
      }
    };
  }
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
  return users.map(sanitizeUser);
};

const changePassword = async (id, { oldPassword, newPassword }) => {
  const pwdCheck = validatePasswordStrength(newPassword);
  if (!pwdCheck.isValid) {
    throw ApiError.badRequest(pwdCheck.message);
  }

  const user = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!user) throw ApiError.notFound("User not found");

  // SSO-only accounts have no hash; argon2.verify throws on null, which
  // surfaced as an opaque 500 instead of telling the user what to do.
  if (!user.password) {
    throw ApiError.badRequest(
      "This account signs in through a provider and has no password yet. Use “Forgot password” to set one."
    );
  }

  // A stored value argon2 cannot parse — a plaintext password, a truncated
  // hash — made this endpoint answer 500 on the old-password check, which is
  // what an admin changing their own password actually hit. It is a dead end
  // rather than a mistyped password, so say so and point at the flow that can
  // set a fresh hash.
  if (!isVerifiableHash(user.password)) {
    securityLogger.security("Change password blocked: stored password is not a usable hash", {
      userId: user.id,
    });
    throw ApiError.badRequest(
      "This account's stored password cannot be verified. Use “Forgot password” to set a new one."
    );
  }

  const valid = await checkPassword(user.password, oldPassword, { userId: user.id });
  if (!valid) {
    throw ApiError.badRequest("Incorrect old password");
  }

  const hashedPassword = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
  activityLogger.activity("Password changed", { userId: id });
};

const verifyPassword = async (id, password) => {
  const user = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!user) throw ApiError.notFound("User not found");
  if (!user.password) return false;
  return await checkPassword(user.password, password, { userId: user.id });
};

module.exports = { list, getById, create, update, remove, exportAll, changePassword, verifyPassword };
