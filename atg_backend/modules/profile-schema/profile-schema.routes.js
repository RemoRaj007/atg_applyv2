const express = require("express");
const controller = require("./profile-schema.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/schema", controller.getSchema);
router.get("/values", controller.getValues);
router.patch("/values", controller.patchValues);
router.get("/progress", controller.getProgress);

// Staff reading a specific candidate. Ordered after the literal routes so
// "values" is never parsed as a user id.
router.get("/:userId/values", controller.getValues);
router.get("/:userId/progress", controller.getProgress);

module.exports = router;
