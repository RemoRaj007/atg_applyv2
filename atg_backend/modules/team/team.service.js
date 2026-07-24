const { prisma } = require("../../config/db");

// Active load = applications currently assigned to an operator that haven't
// reached a terminal state yet (submitted/rejected/skipped)
const ACTIVE_STATUSES = ["pending_approval", "approved"];

const getCapacity = async () => {
  const operators = await prisma.user.findMany({
    where: { role: "operator", d_status: "active" },
    select: { id: true, name: true, email: true, capacity: true },
  });

  const loads = await prisma.candidateApplication.groupBy({
    by: ["staffId"],
    where: { staffId: { not: null }, status: { in: ACTIVE_STATUSES }, d_status: "active" },
    _count: { _all: true },
  });
  const loadByStaffId = new Map(loads.map((l) => [l.staffId, l._count._all]));

  return operators.map((op) => ({
    ...op,
    activeLoad: loadByStaffId.get(op.id) || 0,
  }));
};

const exportAll = async (requester) => {
  const where = { role: "operator", d_status: "active" };
  if (requester.role === "operator") {
    where.id = requester.id;
  }
  const operators = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, capacity: true },
  });

  const loads = await prisma.candidateApplication.groupBy({
    by: ["staffId"],
    where: { staffId: { not: null }, status: { in: ACTIVE_STATUSES }, d_status: "active" },
    _count: { _all: true },
  });
  const loadByStaffId = new Map(loads.map((l) => [l.staffId, l._count._all]));

  return operators.map((op) => ({
    ...op,
    activeLoad: loadByStaffId.get(op.id) || 0,
  }));
};

module.exports = { getCapacity, exportAll };
