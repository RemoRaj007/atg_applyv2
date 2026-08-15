const express = require("express");
const jobController = require("./job.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createJobSchema, updateJobSchema, approveJobSchema, importJobsSchema } = require("./job.schema");
const rateLimit = require("../../middlewares/rateLimit.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "operator", "company", "candidate", "visitor"), jobController.list);
router.get("/recommendations", authorize("admin", "operator", "company", "candidate", "visitor"), jobController.getRecommendations);
router.get("/:id", numericParam("id"), authorize("admin", "operator", "company", "candidate", "visitor"), jobController.getById);
router.post("/", authorize("admin", "operator", "company"), validate(createJobSchema), jobController.create);
router.put("/:id", numericParam("id"), authorize("admin", "operator", "company"), validate(updateJobSchema), jobController.update);
router.patch("/:id/approve", numericParam("id"), authorize("admin", "operator"), validate(approveJobSchema), jobController.approve);
// Admin only, and rate limited: one call fans out to every requested board and
// writes a row per posting, so it is both the most expensive endpoint here and
// the one that reaches third-party services on our behalf.
router.post(
  "/import",
  authorize("admin"),
  rateLimit({ name: "jobs:import", windowMs: 60 * 60 * 1000, max: 20 }),
  validate(importJobsSchema),
  jobController.importJobs
);
router.delete("/:id", numericParam("id"), authorize("admin", "operator"), jobController.remove);

module.exports = router;
