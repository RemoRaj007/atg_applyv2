const express = require("express");
const teamController = require("./team.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

const router = express.Router();

router.use(authenticate, authorize("admin", "operator"));

router.get("/capacity", teamController.getCapacity);
router.get("/capacity/export", teamController.exportCsv);

module.exports = router;
