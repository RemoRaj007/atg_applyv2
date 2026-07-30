const Joi = require("joi");

// The operator/company job form (atg_frontend/src/pages/operator/OperatorJobs.tsx)
// posts these alongside the core fields. They were absent here, and because
// validate.middleware.js runs Joi with stripUnknown:true they were silently
// dropped on every save — including jobRoleId and skills, which together carry
// 55 of the 100 points in fitScore.service.js.
const jobRequirementsSchema = Joi.object({
  experience: Joi.string().max(100).allow(null, ""),
  locationType: Joi.string().max(100).allow(null, ""),
  skills: Joi.array().items(Joi.string().min(1).max(150)).default([]),
});

const createJobSchema = Joi.object({
  company: Joi.string().min(1).max(150).required(),
  title: Joi.string().min(1).max(150).required(),
  location: Joi.string().max(150).allow(null, ""),
  source: Joi.string().max(100).allow(null, ""),
  deadline: Joi.date().allow(null),
  description: Joi.string().max(4000).allow(null, ""),
  jobUrl: Joi.string().uri({ scheme: ["http", "https"] }).max(2000).allow(null, ""),
  fitReason: Joi.string().max(4000).allow(null, ""),
  jobRoleId: Joi.number().integer().positive().allow(null),
  jobRequirements: jobRequirementsSchema,
});

const updateJobSchema = Joi.object({
  company: Joi.string().min(1).max(150),
  title: Joi.string().min(1).max(150),
  location: Joi.string().max(150).allow(null, ""),
  source: Joi.string().max(100).allow(null, ""),
  deadline: Joi.date().allow(null),
  description: Joi.string().max(4000).allow(null, ""),
  jobUrl: Joi.string().uri({ scheme: ["http", "https"] }).max(2000).allow(null, ""),
  fitReason: Joi.string().max(4000).allow(null, ""),
  jobRoleId: Joi.number().integer().positive().allow(null),
  jobRequirements: jobRequirementsSchema,
}).min(1);

// PATCH /jobs/:id/approve wrote req.body.status straight to the column, so any
// string at all could land in Job.status.
const approveJobSchema = Joi.object({
  status: Joi.string().valid("pending_payment", "pending", "approved", "rejected").required(),
});

module.exports = { createJobSchema, updateJobSchema, approveJobSchema };
