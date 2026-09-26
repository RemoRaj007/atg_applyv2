const express = require("express");
const controller = require("./ai.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const rateLimit = require("../../middlewares/rateLimit.middleware");
const { draftSchema, fitSchema, polishSchema } = require("./ai.schema");

const router = express.Router();

// Candidates only. The data sent is the candidate's own, on their own request;
// staff generating text from a candidate's profile would be sharing someone
// else's data, which needs its own consent design first.
router.use(authenticate, authorize("candidate"));

// A burst limit per client. The database quota in ai.service.js is the real
// per-account cap; this just stops one client hammering a single instance.
const generateLimiter = rateLimit({ name: "ai:generate", windowMs: 60 * 1000, max: 6 });

router.get("/status", controller.getStatus);
router.get("/preview", controller.getPreview);
router.post("/application-draft", generateLimiter, validate(draftSchema), controller.draftApplication);
router.post("/fit-explanation", generateLimiter, validate(fitSchema), controller.explainFit);
router.post("/answer-polish", generateLimiter, validate(polishSchema), controller.polishAnswer);

module.exports = router;
