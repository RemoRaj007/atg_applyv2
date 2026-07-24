const express = require("express");
const paymentOptionController = require("./payment-option.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");

const router = express.Router();

// Public / Authenticated route to view active packages
router.get("/", (req, res, next) => {
  // Optional authentication check so req.user is set if logged in
  authenticate(req, res, (err) => {
    // Proceed even if unauthenticated
    paymentOptionController.list(req, res, next);
  });
});

router.get("/:id", (req, res, next) => {
  authenticate(req, res, (err) => {
    paymentOptionController.getById(req, res, next);
  });
});

// Admin-only CRUD
router.post("/", authenticate, authorize("admin"), paymentOptionController.create);
router.patch("/:id", authenticate, authorize("admin"), paymentOptionController.update);
router.delete("/:id", authenticate, authorize("admin"), paymentOptionController.remove);

module.exports = router;
