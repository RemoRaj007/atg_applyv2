const { securityLogger } = require("../../config/atg_logger");

const validate = (schema, source = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });

  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    securityLogger.security("Validation failed", { path: req.originalUrl, message });
    return res.status(400).json({ status: false, message });
  }

  req[source] = value;
  return next();
};

module.exports = validate;
