const Joi = require("joi");

// Admin-only: can create operator/admin/visitor accounts and set role directly
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid("admin", "operator", "candidate", "visitor", "company").default("candidate"),
  phone: Joi.string().max(20).allow(null, ""),
  country: Joi.string().max(100).allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  pkg: Joi.string().valid("Trial", "Premium", "Professional"),
  appsTotal: Joi.number().integer().min(0),
});

// Self-editable subset (any authenticated user updating their own profile)
const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().max(20).allow(null, ""),
  country: Joi.string().max(100).allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  profilePhoto: Joi.string().max(500).allow(null, ""),
  bio: Joi.string().max(1000).allow(null, ""),
  department: Joi.string().max(100).allow(null, ""),
  password: Joi.string().min(8).max(72),
}).min(1);

// Admin-only & Operator: role/package/quota changes
const adminUpdateUserSchema = Joi.object({
  role: Joi.string().valid("admin", "operator", "candidate", "visitor", "company"),
  pkg: Joi.string().valid("Trial", "Premium", "Professional"),
  appsTotal: Joi.number().integer().min(0),
  appsUsed: Joi.number().integer().min(0),
  capacity: Joi.number().integer().min(0),
  password: Joi.string().min(8).max(72),
}).min(1);

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(72).required(),
});

const verifyPasswordSchema = Joi.object({
  password: Joi.string().required(),
});

module.exports = { createUserSchema, updateUserSchema, adminUpdateUserSchema, changePasswordSchema, verifyPasswordSchema };
