const express = require("express");
const router = express.Router();
const jobRoleController = require("./jobRole.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createJobRoleSchema, updateJobRoleSchema } = require("./jobRole.schema");

// Any authenticated user can list active job roles
router.get("/", authenticate, jobRoleController.list);

// Any authenticated user can create a pending job role ("Other")
router.post("/", authenticate, validate(createJobRoleSchema), jobRoleController.create);

// Only operators/admins can get details, update, or delete
router.get("/:id", authenticate, numericParam("id"), authorize("operator", "admin"), jobRoleController.getById);
router.put("/:id", authenticate, numericParam("id"), authorize("operator", "admin"), validate(updateJobRoleSchema), jobRoleController.update);
router.delete("/:id", authenticate, numericParam("id"), authorize("operator", "admin"), jobRoleController.remove);

module.exports = router;
