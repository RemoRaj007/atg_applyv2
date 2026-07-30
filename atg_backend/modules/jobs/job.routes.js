const express = require("express");
const jobController = require("./job.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createJobSchema, updateJobSchema, approveJobSchema } = require("./job.schema");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "operator", "company", "candidate", "visitor"), jobController.list);
router.get("/recommendations", authorize("admin", "operator", "company", "candidate", "visitor"), jobController.getRecommendations);
router.get("/:id", authorize("admin", "operator", "company", "candidate", "visitor"), jobController.getById);
router.post("/", authorize("admin", "operator", "company"), validate(createJobSchema), jobController.create);
router.put("/:id", authorize("admin", "operator", "company"), validate(updateJobSchema), jobController.update);
router.patch("/:id/approve", authorize("admin", "operator"), validate(approveJobSchema), jobController.approve);
router.delete("/:id", authorize("admin", "operator"), jobController.remove);

module.exports = router;
