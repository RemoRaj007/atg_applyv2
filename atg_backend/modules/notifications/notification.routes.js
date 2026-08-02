const express = require("express");
const notificationController = require("./notification.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createNotificationSchema } = require("./notification.schema");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", notificationController.list);
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/", authorize("admin", "operator"), validate(createNotificationSchema), notificationController.create);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", numericParam("id"), notificationController.markRead);


module.exports = router;
