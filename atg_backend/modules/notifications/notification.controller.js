const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const notificationService = require("./notification.service");

const list = asyncHandler(async (req, res) => {
  const notifications = await notificationService.list(req.user);
  sendSuccess(res, { message: "Notifications retrieved", data: { notifications } });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user);
  sendSuccess(res, { message: "Unread count retrieved", data: result });
});

const create = asyncHandler(async (req, res) => {
  const notification = await notificationService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Notification created", data: { notification } });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Notification marked as read", data: { notification } });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user);
  sendSuccess(res, { message: "All notifications marked as read", data: result });
});

module.exports = { list, getUnreadCount, create, markRead, markAllRead };

