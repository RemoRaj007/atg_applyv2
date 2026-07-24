const Joi = require("joi");

const createScholarshipSchema = Joi.object({
  title: Joi.string().min(1).max(150).required(),
  provider: Joi.string().min(1).max(150).required(),
  amount: Joi.number().min(0).allow(null),
  deadline: Joi.date().allow(null),
  description: Joi.string().max(2000).allow(null, ""),
});

const updateScholarshipSchema = Joi.object({
  title: Joi.string().min(1).max(150),
  provider: Joi.string().min(1).max(150),
  amount: Joi.number().min(0).allow(null),
  deadline: Joi.date().allow(null),
  description: Joi.string().max(2000).allow(null, ""),
}).min(1);

module.exports = { createScholarshipSchema, updateScholarshipSchema };
