const express = require("express");
const companyController = require("./company.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "operator"), companyController.list);
router.get("/:id", authorize("admin", "operator"), companyController.getById);
router.post("/", authorize("admin"), companyController.create);
router.put("/:id", authorize("admin"), companyController.update);
router.patch("/:id/approve", authorize("admin"), companyController.approve);
router.delete("/:id", authorize("admin"), companyController.remove);

module.exports = router;
