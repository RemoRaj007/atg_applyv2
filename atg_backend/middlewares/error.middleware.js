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

  // 4xx messages are written for the caller and safe to return. A 500 message is
  // whatever the failing library said — Prisma, for instance, quotes the failing
  // query and the host it could not reach — so it is replaced with a generic
  // line outside development. The full detail is still in the logs above.
  const isClientError = statusCode < 500;
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(statusCode).json({
    status: false,
    message: isClientError || isDevelopment ? message : "Internal server error",
    error: isDevelopment ? err.stack : undefined,
  });
};

module.exports = errorHandler;
