const { prisma } = require("../../config/db");

// The audit trail the app has been writing all along. config/atg_logger.js sends
// every system, activity and security event through PrismaLogTransport into
// LogEntry — this is the read side, which had no route until now.
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const list = async (query = {}) => {
  const where = { d_status: "active" };

  if (query.category) where.category = query.category;
  if (query.level) where.level = query.level;
  if (query.userId) where.userId = Number(query.userId);

  // Free-text match on the message. Prisma's `contains` parameterises the value,
  // so this is not string-concatenated into SQL.
  if (query.search) {
    where.message = { contains: String(query.search), mode: "insensitive" };
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const take = Math.min(Number(query.limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const skip = Math.max(Number(query.offset) || 0, 0);

  // The table grows without bound, so this endpoint is always paginated —
  // returning every row would eventually time out the request and the browser.
  const [logs, total] = await Promise.all([
    prisma.logEntry.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.logEntry.count({ where }),
  ]);

  return { logs, total, limit: take, offset: skip };
};

// Counts per category/level for the dashboard tiles, over a trailing window.
const summary = async (days = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = { d_status: "active", createdAt: { gte: since } };

  const [byCategory, byLevel, total] = await Promise.all([
    prisma.logEntry.groupBy({ by: ["category"], where, _count: { _all: true } }),
    prisma.logEntry.groupBy({ by: ["level"], where, _count: { _all: true } }),
    prisma.logEntry.count({ where }),
  ]);

  const toMap = (rows, key) =>
    Object.fromEntries(rows.map((row) => [row[key], row._count?._all ?? 0]));

  return {
    days,
    total,
    byCategory: toMap(byCategory, "category"),
    byLevel: toMap(byLevel, "level"),
  };
};

module.exports = { list, summary, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE };
