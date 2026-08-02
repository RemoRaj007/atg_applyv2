const express = require("express");
const router = express.Router();
const jobRoleController = require("./jobRole.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");
const { createJobRoleSchema, updateJobRoleSchema } = require("./jobRole.schema");

// Creating is open to every authenticated user, by design — the "Other"
// free-text field on the profile form posts here. That makes it the one write
// on this router an ordinary account can drive, and an unbounded one: each call
// inserts a row an operator then has to review. Proposing a role is a rare,
// deliberate act, so the budget is small.
//
// The staff mutations are limited too. They are behind authorize(), so the risk
// is a compromised or careless operator account rather than the public, and the
// ceiling is correspondingly higher. See middlewares/rateLimit.middleware.js
// for the per-instance caveat on serverless.
const proposeLimiter = rateLimit({ name: "jobRoles:create", windowMs: 60 * 60 * 1000, max: 20 });
const manageLimiter = rateLimit({ name: "jobRoles:manage", windowMs: 15 * 60 * 1000, max: 100 });

// Any authenticated user can list active job roles
router.get("/", authenticate, jobRoleController.list);

// Any authenticated user can create a pending job role ("Other")
router.post("/", authenticate, proposeLimiter, validate(createJobRoleSchema), jobRoleController.create);

// Only operators/admins can get details, update, or delete
router.get("/:id", authenticate, numericParam("id"), authorize("operator", "admin"), jobRoleController.getById);
router.put("/:id", authenticate, manageLimiter, numericParam("id"), authorize("operator", "admin"), validate(updateJobRoleSchema), jobRoleController.update);
router.delete("/:id", authenticate, manageLimiter, numericParam("id"), authorize("operator", "admin"), jobRoleController.remove);

module.exports = router;
