const express = require("express");
const companyController = require("./company.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const {
  createCompanySchema,
  updateCompanySchema,
  approveCompanySchema,
} = require("./company.schema");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "operator"), companyController.list);
router.get("/:id", numericParam("id"), authorize("admin", "operator"), companyController.getById);
router.post("/", authorize("admin"), validate(createCompanySchema), companyController.create);
router.put("/:id", numericParam("id"), authorize("admin"), validate(updateCompanySchema), companyController.update);
router.patch("/:id/approve", numericParam("id"), authorize("admin"), validate(approveCompanySchema), companyController.approve);
router.delete("/:id", numericParam("id"), authorize("admin"), companyController.remove);

module.exports = router;
