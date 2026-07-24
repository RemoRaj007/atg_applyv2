const express = require("express");
const router = express.Router();
const userProfileController = require("./user-profile.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const upload = require("../../middlewares/upload.middleware");

// ── SPECIFIC named routes FIRST (before any wildcards) ──────────────────────

// Personal information
router.put("/personal", authenticate, userProfileController.updatePersonal);

// Job Roles (GET to fetch, PUT to update)
router.get("/jobroles", authenticate, userProfileController.getJobRoles);
router.put("/jobroles", authenticate, userProfileController.updateJobRoles);

// Documents (with multer)
router.post("/document/upload", authenticate, upload.single("file"), userProfileController.uploadDocument);
router.delete("/document/:id", authenticate, userProfileController.deleteDocument);

// Arrays: phones, addresses, academic, languages, itskills, other
router.post("/:entity", authenticate, userProfileController.addEntity);
router.put("/:entity/:id", authenticate, userProfileController.updateEntity);
router.delete("/:entity/:id", authenticate, userProfileController.deleteEntity);

// ── WILDCARD routes LAST ─────────────────────────────────────────────────────
// Get full structured profile by userId (must be last so named routes take priority)
router.get("/:userId", authenticate, userProfileController.getProfile);

module.exports = router;
