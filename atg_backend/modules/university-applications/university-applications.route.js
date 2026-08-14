const express = require("express");
const controller = require("./university-applications.controller");
// `middlewares/auth` does not exist, and this is a default export, not a named
// one. Requiring it threw MODULE_NOT_FOUND while app.js was still loading its
// routers, so the Express app never finished building and *every* endpoint —
// login included — failed. Match the path the other routers use.
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");

const router = express.Router();

// These handlers authenticate and then read and write application records, and
// this router carries no budget of its own. app.js mounts most routers beneath
// the generous /api ceiling, but it does not mount this one at all (see the
// unused `universityApplicationRoutes` require), so nothing constrains these
// routes today and nothing would the moment the mount is added. Give it the
// same purpose-built budget the other record-touching routers have.
router.use(rateLimit({ name: "university-applications", windowMs: 60 * 1000, max: 60 }));

router.post("/", authenticate, controller.create);
router.get("/all", authenticate, controller.listAll);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

module.exports = router;
