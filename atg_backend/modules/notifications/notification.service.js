const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger, systemLogger } = require("../../config/atg_logger");
const { sanitizeForLog } = require("../../utils/sanitizeForLog");
const { sendTemplatedEmail } = require("./email.service");

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

// How many notification emails may be in flight at once. Sending a broadcast
// strictly one at a time made a fan-out to every candidate O(users) sequential
// SMTP round trips inside the request, which is what risks the Vercel function
// timeout; sending all of them at once would instead hand the SMTP server an
// unbounded burst.
const EMAIL_CONCURRENCY = 10;

const emailNotification = async (user, { title, body }) => {
  if (!user || !user.email) return;
  try {
    await sendTemplatedEmail({
      to: user.email,
      templateKey: "notification",
      vars: { name: user.name, title, body },
      fallback: {
        subject: `[ATG Apply] ${title}`,
        body: `Hello ${user.name},\n\n${body}\n\nBest regards,\nATG Apply Team`,
      },
    });
  } catch (err) {
    systemLogger.warn("Failed to send notification email", {
      userId: user.id,
      error: sanitizeForLog(err.message),
    });
  }
};

const create = async (data) => {
  const notification = await prisma.notification.create({ data });
  activityLogger.activity("Notification created", { notificationId: notification.id, userId: notification.userId, type: notification.type });

  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { id: true, name: true, email: true },
  });
  await emailNotification(user, notification);

  return notification;
};

/**
 * Notify a set of users at once.
 *
 * The per-user path did three awaited round trips each — insert, look the user
 * up again for their address, then send — so a broadcast cost 3N sequential
 * calls. Here the rows go in with one createMany, the addresses come from the
 * query that selected the recipients, and the sends run in bounded batches.
 */
const notifyMany = async (users, { type, title, body }) => {
  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, title, body })),
  });
  activityLogger.activity("Notifications created", { type, recipients: users.length });

  for (let i = 0; i < users.length; i += EMAIL_CONCURRENCY) {
    const batch = users.slice(i, i + EMAIL_CONCURRENCY);
    await Promise.all(batch.map((user) => emailNotification(user, { title, body })));
  }
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
      // name and email come back here so the send does not re-query per user.
      select: { id: true, name: true, email: true }
    });

    await notifyMany(users, { type, title, body });
  } catch (err) {
    systemLogger.error("Failed to notify roles", { roles, type, error: sanitizeForLog(err.message) });
  }
};

const notifyCompanyUsers = async ({ companyId, type, title, body }) => {
  if (!companyId) return;
  try {
    const users = await prisma.user.findMany({
      where: { companyId, d_status: "active" },
      select: { id: true, name: true, email: true }
    });

    await notifyMany(users, { type, title, body });
  } catch (err) {
    systemLogger.error("Failed to notify company users", { companyId, type, error: sanitizeForLog(err.message) });
  }
};

module.exports = { 
  list, 
  getUnreadCount, 
  create, 
  markRead, 
  markAllRead, 
  notifyUser, 
  notifyMany,
  notifyRoles, 
  notifyCompanyUsers 
};

