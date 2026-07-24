const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");
const { sendEmail } = require("./email.service");

// Notifications are always scoped to the requester, even for admin/operator
const list = async (requester) => {
  return prisma.notification.findMany({ where: { userId: requester.id, d_status: "active" }, orderBy: { createdAt: "desc" } });
};

const getUnreadCount = async (requester) => {
  const count = await prisma.notification.count({
    where: { userId: requester.id, unread: true, d_status: "active" }
  });
  return { unreadCount: count };
};

const create = async (data) => {
  const notification = await prisma.notification.create({ data });
  activityLogger.activity("Notification created", { notificationId: notification.id, userId: notification.userId, type: notification.type });
  
  // Send email notification automatically
  try {
    const user = await prisma.user.findUnique({ where: { id: notification.userId } });
    if (user && user.email) {
      await sendEmail({
        to: user.email,
        subject: `[ATG Apply] ${notification.title}`,
        body: `Hello ${user.name},\n\n${notification.body}\n\nBest regards,\nATG Apply Team`,
      });
    }
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }

  return notification;
};

const markRead = async (id, requester) => {
  const notification = await prisma.notification.findFirst({ where: { id, d_status: "active" } });
  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.userId !== requester.id) {
    throw ApiError.forbidden("You do not have access to this notification");
  }
  return prisma.notification.update({ where: { id }, data: { unread: false } });
};

const markAllRead = async (requester) => {
  await prisma.notification.updateMany({
    where: { userId: requester.id, unread: true, d_status: "active" },
    data: { unread: false }
  });
  return { message: "All notifications marked as read" };
};

const notifyUser = async ({ userId, type, title, body }) => {
  if (!userId) return null;
  return create({ userId, type, title, body });
};

const notifyRoles = async ({ roles, type, title, body, excludeUserId }) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles },
        d_status: "active",
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: { id: true }
    });

    const createPromises = users.map((u) => create({ userId: u.id, type, title, body }).catch(() => null));
    await Promise.all(createPromises);
  } catch (err) {
    console.error("Failed to notify roles:", err);
  }
};

const notifyCompanyUsers = async ({ companyId, type, title, body }) => {
  if (!companyId) return;
  try {
    const users = await prisma.user.findMany({
      where: { companyId, d_status: "active" },
      select: { id: true }
    });

    const createPromises = users.map((u) => create({ userId: u.id, type, title, body }).catch(() => null));
    await Promise.all(createPromises);
  } catch (err) {
    console.error("Failed to notify company users:", err);
  }
};

module.exports = { 
  list, 
  getUnreadCount, 
  create, 
  markRead, 
  markAllRead, 
  notifyUser, 
  notifyRoles, 
  notifyCompanyUsers 
};

