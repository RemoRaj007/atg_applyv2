const express = require("express");
const jobFormController = require("./job-form.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

router.use(authenticate);

// Columns (defined by company/admin). Reads stay open to any authenticated user
// so candidates can render the form; writes are staff-only — saveColumns deletes
// every existing column for the job before inserting, so an unrestricted POST
// let any candidate destroy a job's application form.
router.get("/jobs/:jobId/columns", jobFormController.getColumns);
router.post("/jobs/:jobId/columns", authorize("admin", "company"), jobFormController.saveColumns);

// Values (filled by operator/admin)
router.get("/applications/:applicationId/values", jobFormController.getValues);
router.post(
  "/applications/:applicationId/values",
  authorize("admin", "operator"),
  upload.any(),
  jobFormController.saveValues
);

module.exports = router;
