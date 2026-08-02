const Joi = require("joi");

// Filters arrive as query-string values, so everything is a string until Joi
// coerces it. Unknown keys are stripped by the validate middleware, which keeps
// arbitrary caller input out of the Prisma `where` clause.
const listLogsSchema = Joi.object({
  category: Joi.string().valid("system", "activity", "security"),
  level: Joi.string().valid("error", "warn", "info", "security", "activity"),
  userId: Joi.number().integer().positive(),
  search: Joi.string().max(200).allow(""),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(200),
  offset: Joi.number().integer().min(0),
});

module.exports = { listLogsSchema };
