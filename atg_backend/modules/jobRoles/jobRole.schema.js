const Joi = require("joi");

// Anyone authenticated may propose a role through the "Other" free-text field,
// so this deliberately exposes only `name` and `skills`. It previously took the
// whole body and spread it into `prisma.jobRole.create`, which let a candidate
// set `status: "active"` (or `d_status`, or `id`) on the row they created.
// Approval is an operator decision — see jobRole.controller.create.
const createJobRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  skills: Joi.array().items(Joi.number().integer().positive()).max(50),
});

// Operators and admins additionally control the review status.
const updateJobRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  status: Joi.string().valid("pending", "active", "rejected"),
  skills: Joi.array().items(Joi.number().integer().positive()).max(50),
}).min(1);

module.exports = { createJobRoleSchema, updateJobRoleSchema };
