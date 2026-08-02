const express = require("express");
const logController = require("./log.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { listLogsSchema } = require("./log.schema");

const router = express.Router();

// Admin only. The audit trail records who did what, and security entries name
// the accounts behind failed logins and denied authorizations — that is not
// something an operator should be able to read about an admin.
router.use(authenticate, authorize("admin"));

router.get("/", validate(listLogsSchema, "query"), logController.list);
router.get("/summary", logController.summary);
router.get("/export", validate(listLogsSchema, "query"), logController.exportCsv);

module.exports = router;
