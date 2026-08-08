const express = require("express");
const controller = require("./document-applications.controller");
const { authenticate } = require("../../middlewares/auth");

const router = express.Router();

router.post("/", authenticate, controller.create);
router.get("/all", authenticate, controller.listAll);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

module.exports = router;
