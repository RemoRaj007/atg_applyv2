const express = require("express");
const paymentController = require("./payment.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createPaymentSchema, updatePaymentSchema } = require("./payment.schema");
const upload = require("../../middlewares/upload.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", paymentController.list);
router.get("/export", authorize("admin", "operator"), paymentController.exportCsv);
router.get("/:id", numericParam("id"), paymentController.getById);
router.post("/", upload.single("slip"), (req, res, next) => {
  if (req.body.amount !== undefined) req.body.amount = Number(req.body.amount);
  if (req.body.jobId !== undefined) req.body.jobId = req.body.jobId ? Number(req.body.jobId) : null;
  if (req.body.appsCount !== undefined) req.body.appsCount = Number(req.body.appsCount);
  next();
}, validate(createPaymentSchema), paymentController.create);
router.patch("/:id", numericParam("id"), authorize("admin", "operator"), validate(updatePaymentSchema), paymentController.update);

module.exports = router;
