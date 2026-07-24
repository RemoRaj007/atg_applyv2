const express = require("express");
const scholarshipController = require("./scholarship.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createScholarshipSchema, updateScholarshipSchema } = require("./scholarship.schema");

const router = express.Router();

router.use(authenticate);

// Any authenticated user can browse scholarships; only staff curate the catalog
router.get("/", scholarshipController.list);
router.get("/:id", scholarshipController.getById);
router.post("/", authorize("admin", "operator"), validate(createScholarshipSchema), scholarshipController.create);
router.put("/:id", authorize("admin", "operator"), validate(updateScholarshipSchema), scholarshipController.update);
router.delete("/:id", authorize("admin"), scholarshipController.remove);

module.exports = router;
