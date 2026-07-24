const Transport = require("winston-transport");
const { prisma } = require("../config/db");

// Persists every log entry to the LogEntry table, in addition to whatever file/console
// transports are configured. Fire-and-forget: a DB outage must never block the request
// that triggered the log, so failures here are only reported to stderr, never thrown.
class PrismaLogTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.category = opts.category;
  }

  log(info, callback) {
    setImmediate(() => this.emit("logged", info));

    const { level, message, timestamp, ...meta } = info;
    prisma.logEntry
      .create({
        data: {
          category: this.category,
          level,
          message: String(message),
          meta: Object.keys(meta).length ? meta : undefined,
          userId: meta.userId ?? null,
        },
      })
      .catch((err) => {
        process.stderr.write(`Failed to persist ${this.category} log entry to DB: ${err.message}\n`);
      });

    callback();
  }
}

module.exports = PrismaLogTransport;
