const Joi = require("joi");

const contactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  subject: Joi.string().min(2).max(150).required(),
  message: Joi.string().min(10).max(5000).required(),
});

module.exports = { contactSchema };
