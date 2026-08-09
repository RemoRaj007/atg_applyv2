const crypto = require("crypto");
const { systemLogger } = require("../config/atg_logger");

// Prisma's own error codes, for the failures that are worth naming rather than
// flattening into "Internal server error".
//
// P2021/P2022 are the ones that matter operationally: they mean the database is
// missing a table or a column the client expects — a migration that was never
// applied to this environment. Every query touching that model then fails, so a
// single unapplied migration reads as "the whole feature is 500ing", with
// nothing in the response to say why. The code names the drift without quoting
// the query, the connection string, or any row data.
const PRISMA_MESSAGES = {
  P2021: "The database is missing a table this API expects. A migration has not been applied to this environment.",
  P2022: "The database is missing a column this API expects. A migration has not been applied to this environment.",
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // Correlates what the caller sees with the log line holding the stack. A 500
  // body is deliberately opaque, which left "I get a 500" and the logs with no
  // way to be matched up — especially on Vercel, where the logs cover every
  // request the deployment served.
  const errorId = crypto.randomUUID();

  if (statusCode >= 500) {
    systemLogger.error(message, {
      errorId,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      statusCode,
      prismaCode: err.code,
      stack: err.stack,
    });
  } else {
    systemLogger.warn(message, {
      errorId,
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
  const namedCause = PRISMA_MESSAGES[err.code];

  const body = {
    status: false,
    message: isClientError || isDevelopment ? message : namedCause || "Internal server error",
    error: isDevelopment ? err.stack : undefined,
  };

  // Only on 500s: a 4xx is already self-explanatory, and an id on every
  // validation error is noise.
  if (!isClientError) body.errorId = errorId;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
