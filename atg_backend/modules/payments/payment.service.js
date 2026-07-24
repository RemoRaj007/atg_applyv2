const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");
const notificationService = require("../notifications/notification.service");

// Admin/operator need platform-wide visibility for revenue reporting & reconciliation;
// candidates only ever see their own payments.
const list = async (requester) => {
  const where = requester.role === "admin" || requester.role === "operator"
    ? { d_status: "active" }
    : { userId: requester.id, d_status: "active" };
  return prisma.payment.findMany({ where, orderBy: { createdAt: "desc" } });
};

const getById = async (id, requester) => {
  const payment = await prisma.payment.findFirst({ where: { id, d_status: "active" } });
  if (!payment) throw ApiError.notFound("Payment not found");
  const canViewAny = requester.role === "admin" || requester.role === "operator";
  if (!canViewAny && payment.userId !== requester.id) {
    throw ApiError.forbidden("You do not have access to this payment");
  }
  return payment;
};

// Candidates and companies create pending payment records; admins may create on behalf of any user
const create = async (data, requester) => {
  const userId = requester.role === "admin" && data.userId ? data.userId : requester.id;
  const paymentData = {
    userId,
    amount: data.amount,
    pkg: data.pkg || "Trial",
    paid: data.paid ?? false,
    status: data.status || "pending",
    method: data.method || "card",
    ref: data.ref || `ref_${Date.now()}`,
    jobId: data.jobId ? Number(data.jobId) : null,
    slipUrl: data.slipUrl || null,
    appsCount: data.appsCount ? Number(data.appsCount) : 0,
    details: data.details || null,
  };
  const payment = await prisma.payment.create({ data: paymentData });
  activityLogger.activity("Payment created", { paymentId: payment.id, userId, amount: payment.amount, jobId: payment.jobId });
  
  if (payment.paid && payment.jobId) {
    await prisma.job.update({
      where: { id: payment.jobId },
      data: { status: "pending" },
    });
    activityLogger.activity("Job post payment confirmed, job status updated to pending approval", { jobId: payment.jobId });
  }

  notificationService.notifyUser({
    userId,
    type: "payment_created",
    title: "Payment Recorded",
    body: `Payment of ${payment.amount} ${payment.currency || "USD"} recorded with status: ${payment.status}.`
  }).catch(() => {});

  notificationService.notifyRoles({
    roles: ["admin"],
    type: "payment_created",
    title: "New Payment Recorded",
    body: `Payment of ${payment.amount} recorded for User ID ${userId}.`
  }).catch(() => {});

  return payment;
};

const update = async (id, data) => {
  const payment = await prisma.payment.findFirst({ where: { id, d_status: "active" } });
  if (!payment) throw ApiError.notFound("Payment not found");
  
  const updated = await prisma.payment.update({ where: { id }, data });
  activityLogger.activity("Payment updated", { paymentId: id, fields: Object.keys(data) });
  
  // If payment status was updated to completed/reconciled, apply the logic
  const isNowCompleted = data.status === "completed" || data.paid === true;
  const wasAlreadyCompleted = payment.status === "completed" || payment.paid === true;

  if (isNowCompleted && !wasAlreadyCompleted) {
    // 1. If it's linked to a job post
    if (updated.jobId) {
      await prisma.job.update({
        where: { id: updated.jobId },
        data: { status: "pending" },
      });
      activityLogger.activity("Job post payment confirmed on update, job status updated to pending approval", { jobId: updated.jobId });
    }

    // 2. If it's a candidate subscription payment with apps count
    if (updated.appsCount > 0) {
      await prisma.user.update({
        where: { id: updated.userId },
        data: { appsTotal: { increment: updated.appsCount } }
      });
      activityLogger.activity("Candidate application limit increased via subscription payment", { userId: updated.userId, increment: updated.appsCount });
    }

    notificationService.notifyUser({
      userId: updated.userId,
      type: "payment_confirmed",
      title: "Payment Confirmed",
      body: `Your payment of ${updated.amount} has been confirmed!`
    }).catch(() => {});
  }
  return updated;
};


const exportAll = async (requester) => {
  const where = { d_status: "active" };
  if (requester.role === "operator") {
    // only payments belonging to users who have applications staffed by this operator
    const staffedUserIds = await prisma.candidateApplication.findMany({
      where: { staffId: requester.id, d_status: "active" },
      select: { userId: true }
    }).then(apps => apps.map(a => a.userId));
    
    where.userId = { in: staffedUserIds };
  }
  return prisma.payment.findMany({ where, orderBy: { createdAt: "desc" } });
};

module.exports = { list, getById, create, update, exportAll };
