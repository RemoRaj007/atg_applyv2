const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");
const PrismaLogTransport = require("../utils/PrismaLogTransport");

const logsDir = path.join(__dirname, "..", "logs");
const isProduction = process.env.NODE_ENV === "production";
// Vercel's filesystem is read-only outside /tmp, so file-rotated logs
// aren't available there; console output (captured by Vercel's log viewer)
// and the DB transport below still work.
const isServerless = Boolean(process.env.VERCEL);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// One category = one dedicated logger: a date-rotated file under logs/<category>_log/,
// a DB copy of every entry, and (outside production) console output.
const buildLogger = (category, levels, colors) => {
  winston.addColors(colors);

  const transports = [new PrismaLogTransport({ category })];

  if (!isServerless) {
    transports.push(
      new winston.transports.DailyRotateFile({
        dirname: path.join(logsDir, `${category}_log`),
        filename: "%DATE%.log",
        datePattern: "DD_MM_YYYY",
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );
  }

  if (!isProduction || isServerless) {
    transports.push(new winston.transports.Console({ format: consoleFormat }));
  }

  return winston.createLogger({
    levels,
    level: Object.keys(levels)[Object.keys(levels).length - 1],
    transports,
  });
};

// system: server lifecycle, unhandled/unexpected errors
const systemLogger = buildLogger(
  "system",
  { error: 0, warn: 1, info: 2 },
  { error: "red", warn: "yellow", info: "green" }
);

// security: authentication, RBAC/ABAC, and validation events
const securityLogger = buildLogger(
  "security",
  { error: 0, warn: 1, security: 2 },
  { error: "red", warn: "yellow", security: "magenta" }
);

// activity: business actions (records created/updated, approvals, etc.)
const activityLogger = buildLogger(
  "activity",
  { error: 0, warn: 1, activity: 2 },
  { error: "red", warn: "yellow", activity: "blue" }
);

module.exports = { systemLogger, securityLogger, activityLogger };
