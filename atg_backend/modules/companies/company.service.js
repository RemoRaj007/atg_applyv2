const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const list = async () => {
  return prisma.company.findMany({
    where: { d_status: "active" },
    orderBy: { createdAt: "desc" },
  });
};

const getById = async (id) => {
  const company = await prisma.company.findFirst({
    where: { id, d_status: "active" },
  });
  if (!company) throw ApiError.notFound("Company not found");
  return company;
};

const create = async (data) => {
  const existing = await prisma.company.findFirst({
    where: { email: data.email, d_status: "active" },
  });
  if (existing) throw ApiError.conflict("A company with this email already exists");

  const company = await prisma.company.create({ data });
  activityLogger.activity("Company registered", { companyId: company.id, name: company.name });
  return company;
};

const update = async (id, data) => {
  await getById(id);
  const company = await prisma.company.update({
    where: { id },
    data,
  });
  activityLogger.activity("Company updated", { companyId: id, fields: Object.keys(data) });
  return company;
};

const updateStatus = async (id, status) => {
  await getById(id);
  const company = await prisma.company.update({
    where: { id },
    data: { status },
  });
  activityLogger.activity(`Company approval ${status}`, { companyId: id, status });
  return company;
};

const remove = async (id) => {
  await getById(id);
  await prisma.company.update({
    where: { id },
    data: { d_status: "inactive" },
  });
  activityLogger.activity("Company soft deleted", { companyId: id });
};

module.exports = { list, getById, create, update, updateStatus, remove };
