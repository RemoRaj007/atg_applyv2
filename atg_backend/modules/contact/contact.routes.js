const express = require("express");
const contactController = require("./contact.controller");
const validate = require("../../middlewares/validations/validate.middleware");
const { contactSchema } = require("./contact.schema");

const router = express.Router();

// Public — no authentication, this is the marketing site's contact form.
router.post("/", validate(contactSchema), contactController.submit);

module.exports = router;
