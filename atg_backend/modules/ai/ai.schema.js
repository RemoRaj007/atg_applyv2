const Joi = require("joi");
const { LANGUAGES, TONES } = require("./ai.prompts");

// `consent: true` is required on every generating call. The consent screen shows
// what will be shared; this makes "the candidate saw it and agreed" a property
// of the request rather than of the UI, so a script or a stale client cannot
// skip it.
const common = {
  consent: Joi.boolean().valid(true).required().messages({
    "any.only": "Please confirm you agree to share the listed profile details with the AI service",
    "any.required": "Please confirm you agree to share the listed profile details with the AI service",
  }),
  includeLimited: Joi.boolean().default(false),
  language: Joi.string().valid(...Object.keys(LANGUAGES)).default("en"),
};

const draftSchema = Joi.object({
  ...common,
  targetType: Joi.string().valid("job", "scholarship").required(),
  targetId: Joi.number().integer().positive().required(),
  tone: Joi.string().valid(...Object.keys(TONES)).default("professional"),
});

const fitSchema = Joi.object({
  ...common,
  jobId: Joi.number().integer().positive().required(),
});

const polishSchema = Joi.object({
  ...common,
  code: Joi.string().max(40).required(),
  answer: Joi.string().trim().min(10).max(4000).required(),
});

module.exports = { draftSchema, fitSchema, polishSchema };
