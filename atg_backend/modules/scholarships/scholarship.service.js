const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const list = async () => prisma.scholarship.findMany({ where: { d_status: "active" }, orderBy: { createdAt: "desc" } });

const getById = async (id) => {
  const scholarship = await prisma.scholarship.findFirst({ where: { id, d_status: "active" } });
  if (!scholarship) throw ApiError.notFound("Scholarship not found");
  return scholarship;
};

const create = async (data) => {
  const scholarship = await prisma.scholarship.create({ data });
  activityLogger.activity("Scholarship created", { scholarshipId: scholarship.id, title: scholarship.title });
  return scholarship;
};

const update = async (id, data) => {
  await getById(id);
  const scholarship = await prisma.scholarship.update({ where: { id }, data });
  activityLogger.activity("Scholarship updated", { scholarshipId: id, fields: Object.keys(data) });
  return scholarship;
};

const remove = async (id) => {
  await getById(id);
  await prisma.scholarship.update({ where: { id }, data: { d_status: "inactive" } });
  activityLogger.activity("Scholarship deleted", { scholarshipId: id });
};

module.exports = { list, getById, create, update, remove };
