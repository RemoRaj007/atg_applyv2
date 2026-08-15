const express = require("express");
const controller = require("./document-applications.controller");
// See the note in university-applications.route.js: `middlewares/auth` is not a
// real module and this is a default export. The bad require took the whole API
// down at load time, not just this router.
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");

const router = express.Router();

// Same budget as university-applications: these handlers authenticate and then
// read and write application records. app.js now mounts this router under the
// /api ceiling too, so the per-router limit is the tighter of the two.
router.use(rateLimit({ name: "document-applications", windowMs: 60 * 1000, max: 60 }));

router.post("/", authenticate, controller.create);
router.get("/all", authenticate, controller.listAll);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

module.exports = router;
