const argon2 = require("argon2");
const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const sanitizeUser = require("../../utils/sanitizeUser");
const { activityLogger } = require("../../config/atg_logger");
const { isValidEmail, validatePasswordStrength, isValidPhone } = require("../../utils/validators");

const list = async () => {
  const users = await prisma.user.findMany({ where: { d_status: "active" }, orderBy: { createdAt: "desc" } });
  return users.map(sanitizeUser);
};

const getById = async (id) => {
  const user = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitizeUser(user);
};

const create = async (data) => {
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

  const existing = await prisma.user.findFirst({ where: { email: data.email, d_status: "active" } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const password = await argon2.hash(data.password);
  const user = await prisma.user.create({ data: { ...data, password } });
  activityLogger.activity("User created", { userId: user.id, email: user.email, role: user.role });
  return sanitizeUser(user);
};

// requester may update their own profile; admin & operators may update any user's profile
const update = async (id, data, requester) => {
  const target = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!target) throw ApiError.notFound("User not found");

  if (requester.role !== "admin" && requester.role !== "operator" && requester.id !== id) {
    throw ApiError.forbidden("You can only update your own profile");
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

const remove = async (id) => {
  const target = await prisma.user.findFirst({ where: { id, d_status: "active" } });
  if (!target) throw ApiError.notFound("User not found");

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

  const valid = await argon2.verify(user.password, oldPassword);
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
  return await argon2.verify(user.password, password);
};

module.exports = { list, getById, create, update, remove, exportAll, changePassword, verifyPassword };
