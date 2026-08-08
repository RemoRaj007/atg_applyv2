const Joi = require("joi");

// The fields an approved edit_user request is allowed to write. Approval feeds
// `details` straight into userService.update, which passes it to Prisma — so
// without this an operator could encode any column at all (quota, package,
// d_status, a nested relation write) into a request and have an admin apply it
// with one click. The admin still decides; this bounds what they can be tricked
// into applying.
const editUserDetailsSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  phone: Joi.string().max(20).allow(null, ""),
  country: Joi.string().max(100).allow(null, ""),
  city: Joi.string().max(100).allow(null, ""),
  role: Joi.string().valid("admin", "operator", "candidate", "visitor", "company"),
  pkg: Joi.string().valid("Trial", "Premium", "Professional"),
  appsTotal: Joi.number().integer().min(0),
  appsUsed: Joi.number().integer().min(0),
  capacity: Joi.number().integer().min(0),
}).min(1);

const createRequestSchema = Joi.object({
  type: Joi.string().valid("edit_user", "delete_user").required(),
  targetId: Joi.number().integer().positive().required(),
  reason: Joi.string().min(3).max(1000).required(),
  details: Joi.object().when("type", {
    is: "edit_user",
    then: editUserDetailsSchema.required(),
    otherwise: Joi.forbidden(),
  }),
});

module.exports = { createRequestSchema, editUserDetailsSchema };
