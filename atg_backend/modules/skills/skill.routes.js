const express = require("express");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const skillController = require("./skill.controller");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

router.use(authenticate);

// Everyone can list skills for dropdowns, etc.
router.get("/", skillController.list);
router.get("/:id", numericParam("id"), skillController.getById);

// Only admin/operator can manage skills
router.use(authorize("admin", "operator"));
router.post("/", skillController.create);
router.put("/:id", numericParam("id"), skillController.update);
router.delete("/:id", numericParam("id"), skillController.remove);

module.exports = router;
