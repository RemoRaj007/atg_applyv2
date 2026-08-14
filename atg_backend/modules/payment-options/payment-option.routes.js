const express = require("express");
const paymentOptionController = require("./payment-option.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const { optionalAuthenticate } = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

// The pricing page reads these before anyone signs in, so the reads are public.
// The previous wrapper called authenticate() and invoked the controller from its
// `next` callback — but authenticate answers 401 itself when there is no token
// and never calls next, so anonymous visitors got a 401 instead of the
// catalogue. optionalAuthenticate attaches req.user when a token is present and
// otherwise carries on, which is all the controller needs to pick a role.
router.get("/", optionalAuthenticate, paymentOptionController.list);
router.get("/:id", optionalAuthenticate, numericParam("id"), paymentOptionController.getById);

// Admin-only CRUD
router.post("/", authenticate, authorize("admin"), paymentOptionController.create);
router.patch("/:id", authenticate, numericParam("id"), authorize("admin"), paymentOptionController.update);
router.delete("/:id", authenticate, numericParam("id"), authorize("admin"), paymentOptionController.remove);

module.exports = router;
