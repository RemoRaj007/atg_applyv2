const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const VALID_DOCUMENT_TYPES = [
  "visa",
  "id",
  "citizenship",
  "bank",
  "passport",
  "driving_license",
  "employment_letter",
  "education_certificate",
  "residence_permit",
  "work_permit",
  "other",
];

const create = async (userId, data) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });
  if (!user) throw ApiError.notFound("User not found");

  if (!user.hasDocumentPackage) {
    throw ApiError.forbidden("You need to purchase the Visa & Documents package first");
  }

  if (!VALID_DOCUMENT_TYPES.includes(data.documentType)) {
    throw ApiError.badRequest(`Invalid document type. Allowed types: ${VALID_DOCUMENT_TYPES.join(", ")}`);
  }

  const app = await prisma.documentApplication.create({
    data: {
      userId: Number(userId),
      documentType: data.documentType,
      status: data.status || "pending",
      submissionDate: data.submissionDate ? new Date(data.submissionDate) : null,
    },
  });

  activityLogger.activity("Document application created", { userId, appId: app.id, docType: app.documentType });
  return app;
};

const list = async (userId) => {
  const apps = await prisma.documentApplication.findMany({
    where: {
      userId: Number(userId),
      d_status: "active",
    },
    orderBy: { createdAt: "desc" },
  });
  return apps;
};

const listAll = async () => {
  const apps = await prisma.documentApplication.findMany({
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
  const app = await prisma.documentApplication.findFirst({
    where: {
      id: Number(id),
      userId: Number(userId),
      d_status: "active",
    },
  });
  if (!app) throw ApiError.notFound("Document application not found");
  return app;
};

const update = async (id, userId, data) => {
  const existing = await getById(id, userId);

  const updateData = {};
  if (data.documentType !== undefined) {
    if (!VALID_DOCUMENT_TYPES.includes(data.documentType)) {
      throw ApiError.badRequest(`Invalid document type. Allowed types: ${VALID_DOCUMENT_TYPES.join(", ")}`);
    }
    updateData.documentType = data.documentType;
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.submissionDate !== undefined) updateData.submissionDate = data.submissionDate ? new Date(data.submissionDate) : null;

  const updated = await prisma.documentApplication.update({
    where: { id: Number(id) },
    data: updateData,
  });

  activityLogger.activity("Document application updated", { userId, appId: id });
  return updated;
};

const remove = async (id, userId) => {
  const app = await getById(id, userId);

  await prisma.documentApplication.update({
    where: { id: Number(id) },
    data: { d_status: "deleted" },
  });

  activityLogger.activity("Document application deleted", { userId, appId: id });
  return { message: "Document application deleted successfully" };
};

module.exports = { create, list, listAll, getById, update, remove };
