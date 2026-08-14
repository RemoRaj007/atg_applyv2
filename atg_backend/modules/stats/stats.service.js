const { prisma } = require("../../config/db");

// The admin dashboard used to build every tile and chart on the client by
// fetching users, jobs, payments, companies, requests and applications in full
// and reducing the arrays in the browser. That is six unbounded table scans per
// page load, and it is also what stopped those endpoints from being paginated —
// capping them would have silently made every number wrong. Computing the
// aggregates in the database removes both problems: the dashboard reads counts,
// and the list endpoints are free to paginate.

const PAID_PAYMENT = {
  d_status: "active",
  OR: [{ paid: true }, { status: "completed" }],
};

const countsByKey = (rows, key) =>
  Object.fromEntries(rows.map((row) => [row[key] ?? "unknown", row._count?._all ?? 0]));

const adminOverview = async () => {
  const activeUser = { d_status: "active" };

  const [
    usersCount,
    jobsCount,
    companiesCount,
    revenueAgg,
    roleRows,
    packageRows,
    statusRows,
    revenueByPackageRows,
    operators,
    workloadRows,
  ] = await Promise.all([
    prisma.user.count({ where: activeUser }),
    prisma.job.count({ where: { d_status: "active", status: "approved" } }),
    prisma.company.count({ where: { d_status: "active" } }),
    prisma.payment.aggregate({ where: PAID_PAYMENT, _sum: { amount: true } }),
    prisma.user.groupBy({ by: ["role"], where: activeUser, _count: { _all: true } }),
    prisma.user.groupBy({ by: ["pkg"], where: activeUser, _count: { _all: true } }),
    prisma.candidateApplication.groupBy({
      by: ["status"],
      where: { d_status: "active" },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({ by: ["pkg"], where: PAID_PAYMENT, _sum: { amount: true } }),
    prisma.user.findMany({
      where: { ...activeUser, role: "operator" },
      select: { id: true, name: true, capacity: true },
    }),
    // One grouped count per (staffId, status) pair replaces filtering the whole
    // application table per operator in the browser.
    prisma.candidateApplication.groupBy({
      by: ["staffId", "status"],
      where: { d_status: "active", staffId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const ACTIVE_STATUSES = ["pending_approval", "approved"];
  const operatorWorkloads = operators.map((op) => {
    const mine = workloadRows.filter((row) => row.staffId === op.id);
    const sum = (rows) => rows.reduce((acc, row) => acc + (row._count?._all ?? 0), 0);
    return {
      id: op.id,
      name: op.name,
      active: sum(mine.filter((row) => ACTIVE_STATUSES.includes(row.status))),
      capacity: op.capacity || 10,
      total: sum(mine),
    };
  });

  return {
    usersCount,
    jobsCount,
    companiesCount,
    totalRevenue: revenueAgg._sum.amount || 0,
    roleCounts: countsByKey(roleRows, "role"),
    packageCounts: countsByKey(packageRows, "pkg"),
    statusCounts: countsByKey(statusRows, "status"),
    revenueByPackage: Object.fromEntries(
      revenueByPackageRows.map((row) => [row.pkg ?? "Trial", row._sum?.amount ?? 0])
    ),
    operatorWorkloads,
  };
};

// Cumulative revenue over the paid payments, oldest first. Only the two columns
// the chart plots are selected, so this stays cheap even as Payment grows.
const MAX_TREND_POINTS = 1000;
const DEFAULT_TREND_POINTS = 200;

// `limit` arrives from the query string, so it is clamped into a fixed range
// rather than merely defaulted — a negative or absurd value must not become the
// row count. NaN falls back to the default.
const clampTrendLimit = (limit) => {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TREND_POINTS;
  return Math.min(parsed, MAX_TREND_POINTS);
};

const revenueTrend = async (limit) => {
  const payments = await prisma.payment.findMany({
    where: PAID_PAYMENT,
    orderBy: { createdAt: "asc" },
    select: { amount: true, createdAt: true },
    take: clampTrendLimit(limit),
  });

  let runningTotal = 0;
  return payments.map((p) => {
    runningTotal += p.amount;
    return { createdAt: p.createdAt, amount: p.amount, cumulative: runningTotal };
  });
};

module.exports = { adminOverview, revenueTrend };
