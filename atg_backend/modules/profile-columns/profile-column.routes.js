const express = require("express");
const profileColumnController = require("./profile-column.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", profileColumnController.list);
router.get("/:id", numericParam("id"), profileColumnController.getById);
router.post("/", authorize("admin"), profileColumnController.create);
router.put("/:id", numericParam("id"), authorize("admin"), profileColumnController.update);
router.delete("/:id", numericParam("id"), authorize("admin"), profileColumnController.remove);

module.exports = router;
