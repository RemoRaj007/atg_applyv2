const Joi = require("joi");

const createPaymentSchema = Joi.object({
  userId: Joi.number().integer(),
  pkg: Joi.string().allow(null, ""),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().max(10),
  method: Joi.string().max(50).allow(null, ""),
  ref: Joi.string().max(255).allow(null, ""),
  jobId: Joi.number().integer().allow(null),
  appsCount: Joi.number().integer().min(0).allow(null),
  details: Joi.string().allow(null, ""),
});

const updatePaymentSchema = Joi.object({
  paid: Joi.boolean(),
  status: Joi.string().valid("pending", "completed", "failed", "refunded", "rejected"),
  method: Joi.string().max(50).allow(null, ""),
  ref: Joi.string().max(255).allow(null, ""),
  operatorComment: Joi.string().allow(null, ""),
}).min(1);

module.exports = { createPaymentSchema, updatePaymentSchema };
