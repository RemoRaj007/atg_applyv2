const express = require("express");
const contentController = require("./content.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const {
  pageParamSchema,
  updateSettingsSchema,
  updateContentSchema,
  updateTemplateSchema,
  listContentQuerySchema,
  listSettingsQuerySchema,
} = require("./content.schema");

const router = express.Router();

// ─── Public reads ────────────────────────────────────────────────────────────
// The marketing site renders before anyone signs in, so these carry no auth.
// publicSettings only ever returns rows flagged isPublic, and the page name is
// validated against a fixed list.
router.get("/public/settings", contentController.getPublicSettings);
router.get("/public/pages/:page", validate(pageParamSchema, "params"), contentController.getPublicContent);

// ─── Admin writes ────────────────────────────────────────────────────────────
router.use(authenticate, authorize("admin"));

router.get("/settings", validate(listSettingsQuerySchema, "query"), contentController.listSettings);
router.put("/settings", validate(updateSettingsSchema), contentController.updateSettings);

router.get("/pages", validate(listContentQuerySchema, "query"), contentController.listContent);
router.put("/pages", validate(updateContentSchema), contentController.updateContent);
router.post("/pages/:page/reset", validate(pageParamSchema, "params"), contentController.resetContent);

router.get("/email-templates", contentController.listTemplates);
router.put("/email-templates/:id", numericParam("id"), validate(updateTemplateSchema), contentController.updateTemplate);
router.post("/email-templates/:id/reset", numericParam("id"), contentController.resetTemplate);

// Loads any default that is missing. Idempotent, and never overwrites an edit.
router.post("/seed", contentController.seed);

module.exports = router;
