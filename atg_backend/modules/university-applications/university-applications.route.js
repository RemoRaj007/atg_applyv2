const express = require("express");
const controller = require("./university-applications.controller");
// `middlewares/auth` does not exist, and this is a default export, not a named
// one. Requiring it threw MODULE_NOT_FOUND while app.js was still loading its
// routers, so the Express app never finished building and *every* endpoint —
// login included — failed. Match the path the other routers use.
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");

const router = express.Router();

// The limiter runs before authentication, not after: work done before the cap
// is work an unauthenticated caller can make this API do for free. Applied with
// `router.use` rather than per route so a route added later inherits the cap
// instead of quietly shipping without one — which is how all six of these
// handlers came to be unlimited.
router.use(rateLimit({ name: "universityApplications:all", windowMs: 15 * 60 * 1000, max: 300 }));
router.use(authenticate);

// Tighter budget on the writes, each of which creates or mutates a row.
const writeLimiter = rateLimit({ name: "universityApplications:write", windowMs: 60 * 60 * 1000, max: 60 });

router.post("/", writeLimiter, controller.create);
router.get("/all", controller.listAll);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.patch("/:id", writeLimiter, controller.update);
router.delete("/:id", writeLimiter, controller.remove);

module.exports = router;
