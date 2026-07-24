const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");

const list = async () => {
  return prisma.jobRole.findMany({
    where: { d_status: "active" },
    orderBy: { name: "asc" },
    include: {
      jobRoleSkills: {
        include: { skill: true }
      }
    }
  });
};

const getById = async (id) => {
  const role = await prisma.jobRole.findFirst({ 
    where: { id, d_status: "active" },
    include: {
      jobRoleSkills: {
        include: { skill: true }
      }
    }
  });
  if (!role) throw ApiError.notFound("Job Role not found");
  return role;
};

const create = async (data) => {
  const exists = await prisma.jobRole.findFirst({ where: { name: data.name, d_status: "active" } });
  if (exists) throw ApiError.badRequest("Job Role with this name already exists");

  const { skills, ...roleData } = data;
  return prisma.jobRole.create({ 
    data: {
      ...roleData,
      ...(skills && Array.isArray(skills) && skills.length > 0
        ? {
            jobRoleSkills: {
              create: skills.map(skillId => ({ skillId }))
            }
          }
        : {})
    },
    include: {
      jobRoleSkills: {
        include: { skill: true }
      }
    }
  });
};

const update = async (id, data) => {
  const role = await getById(id);
  if (data.name && data.name !== role.name) {
    const exists = await prisma.jobRole.findFirst({ where: { name: data.name, d_status: "active" } });
    if (exists) throw ApiError.badRequest("Job Role with this name already exists");
  }

  const { skills, ...roleData } = data;

  return prisma.jobRole.update({
    where: { id },
    data: {
      ...roleData,
      ...(skills && Array.isArray(skills)
        ? {
            jobRoleSkills: {
              deleteMany: {}, // replace all skills
              create: skills.map(skillId => ({ skillId }))
            }
          }
        : {})
    },
    include: {
      jobRoleSkills: {
        include: { skill: true }
      }
    }
  });
};

const remove = async (id) => {
  const role = await getById(id);
  return prisma.jobRole.update({
    where: { id },
    data: { d_status: "inactive" }
  });
};

module.exports = { list, getById, create, update, remove };
