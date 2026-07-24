const express = require("express");
const router = express.Router();
const jobRoleController = require("./jobRole.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

// Any authenticated user can list active job roles
router.get("/", authenticate, jobRoleController.list);

// Any authenticated user can create a pending job role ("Other")
router.post("/", authenticate, jobRoleController.create);

// Only operators/admins can get details, update, or delete
router.get("/:id", authenticate, authorize("operator", "admin"), jobRoleController.getById);
router.put("/:id", authenticate, authorize("operator", "admin"), jobRoleController.update);
router.delete("/:id", authenticate, authorize("operator", "admin"), jobRoleController.remove);

module.exports = router;
