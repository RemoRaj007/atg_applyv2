const express = require("express");
const statsController = require("./stats.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");

const router = express.Router();

// These are the most expensive reads in the API: /admin/overview alone issues
// ten aggregates, three of them group-bys over the whole application and user
// tables. The generous /api ceiling in app.js is not a meaningful budget for
// something that costs this much per call, so it gets its own — the same reason
// /api/health has one for merely touching the database. Comfortably above what
// a dashboard open in a few admin tabs needs.
const statsLimiter = rateLimit({ name: "stats", windowMs: 60 * 1000, max: 30 });

router.use(authenticate);
router.use(statsLimiter);

// These aggregate across every tenant's data, so they are admin-only — the same
// bar the individual list endpoints set for unscoped reads.
router.get("/admin/overview", authorize("admin"), statsController.adminOverview);
router.get("/admin/revenue-trend", authorize("admin"), statsController.revenueTrend);

module.exports = router;
