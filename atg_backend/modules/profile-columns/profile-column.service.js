const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const list = async () => {
  return prisma.profileColumn.findMany({
    where: { d_status: "active" },
    orderBy: { createdAt: "asc" },
  });
};

const getById = async (id) => {
  const col = await prisma.profileColumn.findFirst({
    where: { id, d_status: "active" },
  });
  if (!col) throw ApiError.notFound("Profile column not found");
  return col;
};

const create = async (data) => {
  const existing = await prisma.profileColumn.findFirst({
    where: { name: data.name, d_status: "active" },
  });
  if (existing) {
    throw ApiError.conflict("A profile column with this name already exists");
  }

  const col = await prisma.profileColumn.create({ data });
  activityLogger.activity("Profile Column created", { id: col.id, name: col.name });
  return col;
};

const update = async (id, data) => {
  const existing = await prisma.profileColumn.findFirst({
    where: { id, d_status: "active" },
  });
  if (!existing) throw ApiError.notFound("Profile column not found");

  if (data.name && data.name !== existing.name) {
    const conflict = await prisma.profileColumn.findFirst({
      where: { name: data.name, d_status: "active" },
    });
    if (conflict) {
      throw ApiError.conflict("A profile column with this name already exists");
    }
  }

  const col = await prisma.profileColumn.update({
    where: { id },
    data,
  });
  activityLogger.activity("Profile Column updated", { id, fields: Object.keys(data) });
  return col;
};

const remove = async (id) => {
  const existing = await prisma.profileColumn.findFirst({
    where: { id, d_status: "active" },
  });
  if (!existing) throw ApiError.notFound("Profile column not found");

  // Soft delete column
  await prisma.profileColumn.update({
    where: { id },
    data: { d_status: "inactive" },
  });

  // Soft delete related profile values
  await prisma.profileValue.updateMany({
    where: { columnId: id },
    data: { d_status: "inactive" },
  });

  activityLogger.activity("Profile Column deleted", { id });
};

module.exports = { list, getById, create, update, remove };
