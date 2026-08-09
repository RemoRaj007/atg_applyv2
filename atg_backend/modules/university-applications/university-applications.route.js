const express = require("express");
const controller = require("./university-applications.controller");
// `middlewares/auth` does not exist, and this is a default export, not a named
// one. Requiring it threw MODULE_NOT_FOUND while app.js was still loading its
// routers, so the Express app never finished building and *every* endpoint —
// login included — failed. Match the path the other routers use.
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");

const router = express.Router();

router.post("/", authenticate, controller.create);
router.get("/all", authenticate, controller.listAll);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

module.exports = router;
