const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const getByUserId = async (userId) => {
  return prisma.profileValue.findMany({
    where: { userId, d_status: "active" },
    include: {
      column: true,
    },
  });
};

const saveValues = async (userId, values) => {
  const colIds = values.map(v => v.columnId);
  const validCols = await prisma.profileColumn.findMany({
    where: { id: { in: colIds }, d_status: "active" },
  });
  
  const validColIds = validCols.map(c => c.id);
  const ops = [];
  
  for (const item of values) {
    if (!validColIds.includes(item.columnId)) continue;
    ops.push(
      prisma.profileValue.upsert({
        where: {
          userId_columnId: {
            userId,
            columnId: item.columnId,
          },
        },
        update: {
          value: item.value,
          d_status: "active",
        },
        create: {
          userId,
          columnId: item.columnId,
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
