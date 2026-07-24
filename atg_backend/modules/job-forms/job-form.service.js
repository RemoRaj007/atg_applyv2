const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const getColumnsByJobId = async (jobId) => {
  return prisma.jobFormColumn.findMany({
    where: { jobId, d_status: "active" },
    orderBy: { createdAt: "asc" },
  });
};

const saveColumns = async (jobId, columns) => {
  // First, mark all existing columns for this job as inactive to do a complete sync
  await prisma.jobFormColumn.updateMany({
    where: { jobId },
    data: { d_status: "inactive" },
  });

  const results = [];
  for (const item of columns) {
    const col = await prisma.jobFormColumn.create({
      data: {
        jobId,
        name: item.name,
        label: item.label,
        inputType: item.inputType || "text",
        isRequired: item.isRequired ?? false,
        options: item.options || null,
      },
    });
    results.push(col);
  }

  activityLogger.activity("Job Form Columns updated", { jobId, count: columns.length });
  return results;
};

const getValuesByApplicationId = async (applicationId) => {
  return prisma.jobFormValue.findMany({
    where: { applicationId, d_status: "active" },
    include: {
      column: true,
    },
  });
};

const saveValues = async (applicationId, values) => {
  const results = [];
  
  for (const item of values) {
    const { columnId, value } = item;

    // Check if column exists
    const col = await prisma.jobFormColumn.findFirst({
      where: { id: columnId, d_status: "active" },
    });
    if (!col) continue;

    // Upsert value
    const jfv = await prisma.jobFormValue.upsert({
      where: {
        applicationId_columnId: {
          applicationId,
          columnId,
        },
      },
      update: {
        value,
        d_status: "active",
      },
      create: {
        applicationId,
        columnId,
        value,
      },
    });
    results.push(jfv);
  }

  activityLogger.activity("Job Form Values updated", { applicationId, count: values.length });
  return results;
};

module.exports = {
  getColumnsByJobId,
  saveColumns,
  getValuesByApplicationId,
  saveValues,
};
