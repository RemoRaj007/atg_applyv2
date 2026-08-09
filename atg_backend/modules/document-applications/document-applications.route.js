const express = require("express");
const controller = require("./document-applications.controller");
// See the note in university-applications.route.js: `middlewares/auth` is not a
// real module and this is a default export. The bad require took the whole API
// down at load time, not just this router.
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");

const router = express.Router();

router.post("/", authenticate, controller.create);
router.get("/all", authenticate, controller.listAll);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

module.exports = router;
