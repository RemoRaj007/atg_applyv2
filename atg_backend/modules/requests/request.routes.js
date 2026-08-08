const express = require("express");
const requestController = require("./request.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createRequestSchema } = require("./request.schema");

const router = Router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "operator"), requestController.list);
router.post("/", authorize("admin", "operator"), validate(createRequestSchema), requestController.create);
router.patch("/:id/approve", numericParam("id"), authorize("admin"), requestController.approve);
router.patch("/:id/reject", numericParam("id"), authorize("admin"), requestController.reject);

module.exports = router;
