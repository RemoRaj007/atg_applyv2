const express = require("express");
const authController = require("./auth.controller");
const validate = require("../../middlewares/validations/validate.middleware");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, googleSchema } = require("./auth.schema");

const router = express.Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/google", validate(googleSchema), authController.googleLogin);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
