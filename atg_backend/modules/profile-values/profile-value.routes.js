const express = require("express");
const profileValueController = require("./profile-value.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const upload = require("../../middlewares/upload.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", profileValueController.getByUserId);
router.get("/:userId", profileValueController.getByUserId);
router.post("/", upload.any(), profileValueController.saveValues);

module.exports = router;
