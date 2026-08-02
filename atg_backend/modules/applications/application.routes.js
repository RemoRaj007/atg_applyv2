const express = require("express");
const applicationController = require("./application.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const upload = require("../../middlewares/upload.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const {
  createApplicationSchema,
  linkRequestSchema,
  fitReviewSchema,
  updateStatusSchema,
  approvalSchema,
  feedbackSchema,
  createCommentSchema,
} = require("./application.schema");

const router = express.Router();

router.use(authenticate);

router.get("/", applicationController.list);
router.get("/export", authorize("operator", "admin"), applicationController.exportCsv);
router.get("/:id", numericParam("id"), applicationController.getById);

// Standard application (quota-consumed on create)
router.post("/", authorize("candidate", "operator", "admin"), validate(createApplicationSchema), applicationController.create);

// NEW: Job link request — candidate submits a URL (NO quota consumed)
router.post("/link-request", authorize("candidate"), validate(linkRequestSchema), applicationController.createLinkRequest);

router.patch("/:id/candidate-approval", numericParam("id"), authorize("candidate"), validate(approvalSchema), applicationController.setCandidateApproval);
router.patch("/:id/qc-approval", numericParam("id"), authorize("operator", "admin"), validate(approvalSchema), applicationController.setQcApproval);
router.patch("/:id/book", numericParam("id"), authorize("operator"), applicationController.book);

// NEW: Operator submits fit assessment for a link request
router.patch("/:id/fit-review", numericParam("id"), authorize("operator", "admin"), validate(fitReviewSchema), applicationController.submitFitReview);

// NEW: Candidate confirms apply after reviewing fit assessment (quota consumed here)
router.patch("/:id/confirm-apply", numericParam("id"), authorize("candidate"), applicationController.confirmApply);

router.patch("/:id", numericParam("id"), authorize("operator", "admin"), upload.array("proof", 10), (req, res, next) => {
  // If req.body is multipart, values might be strings. Let's make sure req.body properties are formatted properly
  next();
}, validate(updateStatusSchema), applicationController.updateStatus);
router.post("/:id/comments", numericParam("id"), authorize("candidate", "operator", "admin"), validate(createCommentSchema), applicationController.addComment);
router.post("/:id/feedback", numericParam("id"), authorize("candidate"), validate(feedbackSchema), applicationController.saveFeedback);
router.delete("/:id", numericParam("id"), authorize("admin"), applicationController.remove);

module.exports = router;
