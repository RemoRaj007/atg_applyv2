const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");
const userService = require("../users/user.service");
const notificationService = require("../notifications/notification.service");

const list = async () => {
  const requests = await prisma.changeRequest.findMany({
    where: { d_status: "active" },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const updatedRequests = [];
  for (const req of requests) {
    const targetUser = await prisma.user.findFirst({
      where: { id: req.targetId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        pkg: true,
        phone: true,
        country: true,
        city: true,
        isLegendary: true,
        appsTotal: true,
        capacity: true,
      },
    });
    updatedRequests.push({
      ...req,
      targetUser: targetUser || null,
    });
  }
  return updatedRequests;
};

const create = async (data, operatorId) => {
  const request = await prisma.changeRequest.create({
    data: {
      type: data.type,
      targetId: Number(data.targetId),
      reason: data.reason,
      details: data.details ? JSON.stringify(data.details) : null,
      createdById: operatorId,
    },
  });
  activityLogger.activity("Change request submitted by operator", { requestId: request.id, operatorId });

  notificationService.notifyRoles({
    roles: ["admin"],
    type: "change_request_submitted",
    title: "New Change Request",
    body: `Operator requested ${data.type} for target user ID ${data.targetId}.`
  }).catch(() => {});

  return request;
};

const approve = async (id, requester) => {
  const request = await prisma.changeRequest.findFirst({
    where: { id, d_status: "active" },
  });
  if (!request) throw ApiError.notFound("Request not found");
  if (request.status !== "pending") throw ApiError.badRequest("Request is already processed");

  if (request.type === "edit_user") {
    const details = JSON.parse(request.details || "{}");
    await userService.update(request.targetId, details, requester);
    activityLogger.activity("User edit change request executed", { targetId: request.targetId, executedBy: requester.id });
  } else if (request.type === "delete_user") {
    await userService.remove(request.targetId);
    activityLogger.activity("User soft-delete change request executed", { targetId: request.targetId, executedBy: requester.id });
  }

  const updatedRequest = await prisma.changeRequest.update({
    where: { id },
    data: { status: "approved" },
  });

  notificationService.notifyUser({
    userId: request.createdById,
    type: "change_request_approved",
    title: "Change Request Approved",
    body: `Your change request (${request.type}) for target ID ${request.targetId} was approved.`
  }).catch(() => {});

  return updatedRequest;
};

const reject = async (id, requester) => {
  const request = await prisma.changeRequest.findFirst({
    where: { id, d_status: "active" },
  });
  if (!request) throw ApiError.notFound("Request not found");
  if (request.status !== "pending") throw ApiError.badRequest("Request is already processed");

  const updatedRequest = await prisma.changeRequest.update({
    where: { id },
    data: { status: "rejected" },
  });

  activityLogger.activity("Change request rejected by admin", { requestId: id, rejectedBy: requester.id });

  notificationService.notifyUser({
    userId: request.createdById,
    type: "change_request_rejected",
    title: "Change Request Rejected",
    body: `Your change request (${request.type}) for target ID ${request.targetId} was rejected.`
  }).catch(() => {});

  return updatedRequest;
};

module.exports = { list, create, approve, reject };

