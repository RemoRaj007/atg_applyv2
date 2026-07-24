const express = require("express");
const jobFormController = require("./job-form.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

router.use(authenticate);

// Columns (defined by company/admin)
router.get("/jobs/:jobId/columns", jobFormController.getColumns);
router.post("/jobs/:jobId/columns", jobFormController.saveColumns);

// Values (filled by operator/admin)
router.get("/applications/:applicationId/values", jobFormController.getValues);
router.post("/applications/:applicationId/values", upload.any(), jobFormController.saveValues);

module.exports = router;
