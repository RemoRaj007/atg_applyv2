const Joi = require("joi");

const createNotificationSchema = Joi.object({
  userId: Joi.number().integer().required(),
  type: Joi.string().max(50).required(),
  title: Joi.string().max(150).required(),
  body: Joi.string().max(1000).required(),
});

module.exports = { createNotificationSchema };
