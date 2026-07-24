const express = require("express");
const router = express.Router();
const controller = require("./anonymous-discovery.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

// Candidate routes
router.get("/profile", authenticate, authorize("candidate"), controller.getProfile);
router.put("/profile", authenticate, authorize("candidate"), controller.updateProfile);

router.get("/operators", authenticate, authorize("candidate"), controller.getOperators);
router.post("/operators", authenticate, authorize("candidate"), controller.createOperator);
router.put("/operators/:operatorId", authenticate, authorize("candidate"), controller.toggleOperator);
router.delete("/operators/:operatorId", authenticate, authorize("candidate"), controller.deleteOperator);

router.get("/matches", authenticate, authorize("candidate"), controller.getMatches);
router.put("/matches/:matchId", authenticate, authorize("candidate"), controller.updateMatchStatus);
router.post("/run", authenticate, authorize("candidate"), controller.runDiscovery);

// Admin/Operator routes
router.get("/admin/profiles", authenticate, authorize("operator", "admin"), controller.adminGetAllProfiles);
router.post("/admin/run/:profileId", authenticate, authorize("operator", "admin"), controller.adminRunDiscoveryForProfile);

module.exports = router;
