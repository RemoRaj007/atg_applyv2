const express = require("express");
const controller = require("./profileSchema.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");
const { patchFieldsSchema, reviewSchema, correctionSchema, noteSchema } = require("./profileSchema.schema");

const router = express.Router();

// Every route on this router touches career and private data, so none of it is
// reachable unauthenticated.
router.use(authenticate);

// The schema itself carries no candidate data — it is the question catalogue —
// so any signed-in user may read it. The builder and the operator view render
// from the same response, which is the point of having one schema.
router.get("/schema", controller.getSchema);

// "me" routes are scoped by req.user.id rather than by a path parameter. There
// is deliberately no /profile/:userId write path: ownership cannot be forged
// when the id is never taken from the request.
router.get("/me", controller.getMyProfile);
router.patch("/me/fields", validate(patchFieldsSchema), controller.patchMyFields);
router.delete("/me/entries/:code/:repeatIndex", controller.removeMyEntry);
router.post("/me/review", validate(reviewSchema), controller.submitForReview);
// Corrections an operator has asked this candidate to make.
router.get("/me/corrections", controller.myCorrections);

// Staff read-only view. Restricted values are withheld inside the service for
// anyone who is not the owner or an admin, so this is not the only line
// standing between an operator and a referee's phone number.
router.get(
  "/users/:userId",
  numericParam("userId"),
  authorize("admin", "operator"),
  controller.getUserProfileForStaff
);

// Correction requests: the operator's only route to changing a candidate fact
// is to ask the candidate for it. There is deliberately no staff write path to
// ProfileValue anywhere in this router.
router.post(
  "/users/:userId/corrections",
  numericParam("userId"),
  authorize("admin", "operator"),
  validate(correctionSchema),
  controller.requestCorrection
);
router.get(
  "/users/:userId/corrections",
  numericParam("userId"),
  authorize("admin", "operator"),
  controller.listCorrections
);

// Private operator notes, kept apart from candidate facts and never returned
// on the candidate's own /me routes.
router.post(
  "/users/:userId/notes",
  numericParam("userId"),
  authorize("admin", "operator"),
  validate(noteSchema),
  controller.addNote
);
router.get(
  "/users/:userId/notes",
  numericParam("userId"),
  authorize("admin", "operator"),
  controller.listNotes
);

module.exports = router;
