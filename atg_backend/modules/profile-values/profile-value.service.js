const { prisma } = require("../../config/db");
const { activityLogger } = require("../../config/atg_logger");

// Sensitivity levels a member of staff may read on someone else's profile.
// RESTRICTED is excluded: it is released just-in-time for a named application,
// with the candidate's approval, not rendered on every profile open.
//
// This mirrors the rule in modules/profile-schema/profileSchema.service.js. It
// has to be applied here too: this endpoint reads the same ProfileValue table,
// so once candidates started entering restricted answers through the profile
// builder, an unfiltered read here handed them to any operator — the gating on
// the newer endpoint was not enough on its own.
const STAFF_READABLE_SENSITIVITY = ["CAREER", "PRIVATE", "SENSITIVE"];

/**
 * @param {number} userId whose values to read
 * @param {object} viewer { id, role } — decides whether restricted values are
 *   included. Defaults to treating the caller as a non-owner, so a caller that
 *   forgets to pass it gets the safer answer rather than the leakier one.
 */
const getByUserId = async (userId, viewer = null) => {
  const values = await prisma.profileValue.findMany({
    where: { userId, d_status: "active" },
    include: { column: true },
  });

  const isSelf = viewer?.id === userId;
  const isAdmin = viewer?.role === "admin";
  if (isSelf || isAdmin) return values;

  return values.filter((value) =>
    STAFF_READABLE_SENSITIVITY.includes(value.column?.sensitivity ?? "CAREER")
  );
};

const saveValues = async (userId, values) => {
  const colIds = values.map((v) => v.columnId);
  const validCols = await prisma.profileColumn.findMany({
    where: { id: { in: colIds }, d_status: "active" },
  });

  const validColIds = validCols.map((c) => c.id);
  const ops = [];

  for (const item of values) {
    if (!validColIds.includes(item.columnId)) continue;
    ops.push(
      prisma.profileValue.upsert({
        where: {
          // repeatIndex 0 is the single-value case. The unique key gained that
          // third column when repeatable groups arrived; this form of the
          // endpoint only ever writes the first entry.
          userId_columnId_repeatIndex: {
            userId,
            columnId: item.columnId,
            repeatIndex: 0,
          },
        },
        update: {
          value: item.value,
          d_status: "active",
        },
        create: {
          userId,
          columnId: item.columnId,
          repeatIndex: 0,
          value: item.value,
        },
      })
    );
  }

  const results = await prisma.$transaction(ops);
  activityLogger.activity("Profile Values updated", { userId, count: results.length });
  return results;
};

module.exports = { getByUserId, saveValues };
