const express = require("express");
const statsController = require("./stats.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

const router = express.Router();

router.use(authenticate);

// These aggregate across every tenant's data, so they are admin-only — the same
// bar the individual list endpoints set for unscoped reads.
router.get("/admin/overview", authorize("admin"), statsController.adminOverview);
router.get("/admin/revenue-trend", authorize("admin"), statsController.revenueTrend);

module.exports = router;
