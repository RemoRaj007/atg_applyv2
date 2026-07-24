const { systemLogger } = require("../config/atg_logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    systemLogger.error(message, {
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      statusCode,
      stack: err.stack,
    });
  } else {
    systemLogger.warn(message, {
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      statusCode,
    });
  }

  res.status(statusCode).json({
    status: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorHandler;
