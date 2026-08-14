const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const MAX_UNIVERSITY_APPS = 20;

const create = async (userId, data) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });
  if (!user) throw ApiError.notFound("User not found");

  if (!user.hasUniversityPackage) {
    throw ApiError.forbidden("You need to purchase the University & Scholarships package first");
  }

  if (user.universityAppsUsed >= MAX_UNIVERSITY_APPS) {
    throw ApiError.badRequest(`You have reached the maximum limit of ${MAX_UNIVERSITY_APPS} university applications`);
  }

  const app = await prisma.universityApplication.create({
    data: {
      userId: Number(userId),
      universityName: data.universityName,
      programName: data.programName,
      applicationStatus: data.applicationStatus || "pending",
      submissionDate: data.submissionDate ? new Date(data.submissionDate) : null,
    },
  });

  await prisma.user.update({
    where: { id: Number(userId) },
    data: { universityAppsUsed: user.universityAppsUsed + 1 },
  });

  activityLogger.activity("University application created", { userId, appId: app.id, university: app.universityName });
  return app;
};

const list = async (userId) => {
  const apps = await prisma.universityApplication.findMany({
    where: {
      userId: Number(userId),
      d_status: "active",
    },
    orderBy: { createdAt: "desc" },
  });
  return apps;
};

const listAll = async () => {
  const apps = await prisma.universityApplication.findMany({
    where: { d_status: "active" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return apps;
};

const getById = async (id, userId) => {
  const app = await prisma.universityApplication.findFirst({
    where: {
      id: Number(id),
      userId: Number(userId),
      d_status: "active",
    },
  });
  if (!app) throw ApiError.notFound("University application not found");
  return app;
};

const update = async (id, userId, data) => {
  const existing = await getById(id, userId);

  const updateData = {};
  if (data.universityName !== undefined) updateData.universityName = data.universityName;
  if (data.programName !== undefined) updateData.programName = data.programName;
  if (data.applicationStatus !== undefined) updateData.applicationStatus = data.applicationStatus;
  if (data.submissionDate !== undefined) updateData.submissionDate = data.submissionDate ? new Date(data.submissionDate) : null;

  const updated = await prisma.universityApplication.update({
    where: { id: Number(id) },
    data: updateData,
  });

  activityLogger.activity("University application updated", { userId, appId: id });
  return updated;
};

const remove = async (id, userId) => {
  const app = await getById(id, userId);

  await prisma.universityApplication.update({
    where: { id: Number(id) },
    data: { d_status: "deleted" },
  });

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });

  if (user && user.universityAppsUsed > 0) {
    await prisma.user.update({
      where: { id: Number(userId) },
      data: { universityAppsUsed: user.universityAppsUsed - 1 },
    });
  }

  activityLogger.activity("University application deleted", { userId, appId: id });
  return { message: "University application deleted successfully" };
};

module.exports = { create, list, listAll, getById, update, remove };
