const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");

const list = async () => {
  return prisma.skill.findMany({
    where: { d_status: "active" },
    orderBy: { name: "asc" }
  });
};

const getById = async (id) => {
  const skill = await prisma.skill.findFirst({ where: { id, d_status: "active" } });
  if (!skill) throw ApiError.notFound("Skill not found");
  return skill;
};

const create = async (data) => {
  const exists = await prisma.skill.findFirst({ where: { name: data.name, d_status: "active" } });
  if (exists) throw ApiError.badRequest("Skill with this name already exists");

  return prisma.skill.create({ data });
};

const update = async (id, data) => {
  const skill = await getById(id);
  if (data.name && data.name !== skill.name) {
    const exists = await prisma.skill.findFirst({ where: { name: data.name, d_status: "active" } });
    if (exists) throw ApiError.badRequest("Skill with this name already exists");
  }

  return prisma.skill.update({ where: { id }, data });
};

const remove = async (id) => {
  const skill = await getById(id);
  return prisma.skill.update({
    where: { id },
    data: { d_status: "inactive" }
  });
};

module.exports = { list, getById, create, update, remove };
