const Joi = require("joi");

// Pages that may be addressed. Anything else is rejected before it becomes a
// Prisma filter, so the public endpoint cannot be used to probe for other rows.
const PAGES = ["landing", "pricing", "how-it-works", "privacy", "terms", "contact"];

const pageParamSchema = Joi.object({
  page: Joi.string().valid(...PAGES).required(),
});

const updateSettingsSchema = Joi.object({
  settings: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().max(100).required(),
        // Type-specific validation happens in the service, which knows each
        // key's declared type; here it only has to be a storable scalar.
        value: Joi.alternatives(Joi.string().allow(""), Joi.number(), Joi.boolean()).required(),
      })
    )
    .min(1)
    .max(100)
    .required(),
});

const updateContentSchema = Joi.object({
  blocks: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        value: Joi.string().allow("").max(20000).required(),
      })
    )
    .min(1)
    .max(100)
    .required(),
});

const updateTemplateSchema = Joi.object({
  subject: Joi.string().min(1).max(200),
  body: Joi.string().min(1).max(20000),
  isActive: Joi.boolean(),
}).min(1);

const listContentQuerySchema = Joi.object({
  page: Joi.string().valid(...PAGES),
});

const listSettingsQuerySchema = Joi.object({
  group: Joi.string().valid("general", "branding", "contact", "social", "limits"),
});

module.exports = {
  PAGES,
  pageParamSchema,
  updateSettingsSchema,
  updateContentSchema,
  updateTemplateSchema,
  listContentQuerySchema,
  listSettingsQuerySchema,
};
