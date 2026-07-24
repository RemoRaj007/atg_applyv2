const express = require("express");
const requestController = require("./request.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

const router = Router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin", "operator"), requestController.list);
router.post("/", authorize("admin", "operator"), requestController.create);
router.patch("/:id/approve", authorize("admin"), requestController.approve);
router.patch("/:id/reject", authorize("admin"), requestController.reject);

module.exports = router;
