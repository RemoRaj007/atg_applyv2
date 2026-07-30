const Joi = require("joi");

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).max(72).required(),
  phone: Joi.string().max(20).allow(null, ""),
  country: Joi.string().max(100).allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  isCompany: Joi.boolean(),
  companyName: Joi.string().min(1).max(150).when("isCompany", { is: true, then: Joi.required() }),
  companyWebsite: Joi.string().max(255).allow(null, ""),
  companyDescription: Joi.string().max(2000).allow(null, ""),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(72).required(),
});

// Both providers post the same shape: an ID token under either key. Google
// Identity Services calls it `credential`; MSAL calls it `idToken`.
const socialLoginSchema = Joi.object({
  idToken: Joi.string().allow(null, ""),
  credential: Joi.string().allow(null, ""),
}).or("idToken", "credential");

const googleSchema = socialLoginSchema;
const microsoftSchema = socialLoginSchema;

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, googleSchema, microsoftSchema };
