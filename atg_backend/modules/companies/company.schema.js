const Joi = require("joi");

// company.routes.js had no validate() on create/update at all, so req.body went
// straight into prisma.company.create. That let a `javascript:` string land in
// Company.website, which the admin tables then rendered into an href — a stored
// XSS with the admin's session behind it. Constraining the scheme here is the
// half of the fix that keeps the value out of the database; the rendering side
// is guarded by safeExternalUrl in atg_frontend/src/utils/validation.ts.
const websiteField = Joi.string()
  .uri({ scheme: ["http", "https"] })
  .max(2000)
  .allow(null, "");

const createCompanySchema = Joi.object({
  name: Joi.string().min(1).max(150).required(),
  email: Joi.string().email().max(255).required(),
  website: websiteField,
  description: Joi.string().max(4000).allow(null, ""),
});

const updateCompanySchema = Joi.object({
  name: Joi.string().min(1).max(150),
  email: Joi.string().email().max(255),
  website: websiteField,
  description: Joi.string().max(4000).allow(null, ""),
}).min(1);

// updateStatus wrote req.body.status to the column unchecked, the same gap
// job.schema.js closed for Job.status.
const approveCompanySchema = Joi.object({
  status: Joi.string().valid("pending", "approved", "rejected").required(),
});

module.exports = { createCompanySchema, updateCompanySchema, approveCompanySchema };
