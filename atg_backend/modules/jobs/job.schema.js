const Joi = require("joi");

const createJobSchema = Joi.object({
  company: Joi.string().min(1).max(150).required(),
  title: Joi.string().min(1).max(150).required(),
  location: Joi.string().max(150).allow(null, ""),
  source: Joi.string().max(100).allow(null, ""),
  deadline: Joi.date().allow(null),
  description: Joi.string().max(4000).allow(null, ""),
});

const updateJobSchema = Joi.object({
  company: Joi.string().min(1).max(150),
  title: Joi.string().min(1).max(150),
  location: Joi.string().max(150).allow(null, ""),
  source: Joi.string().max(100).allow(null, ""),
  deadline: Joi.date().allow(null),
  description: Joi.string().max(4000).allow(null, ""),
}).min(1);

module.exports = { createJobSchema, updateJobSchema };
