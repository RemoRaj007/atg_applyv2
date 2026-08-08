const express = require("express");
const userController = require("./atg_user.controller");
const authenticate = require("../../middlewares/permissions/atg_authenticate.middleware");
const authorize = require("../../middlewares/permissions/authorize.middleware");
const validate = require("../../middlewares/validations/validate.middleware");
const { createUserSchema, updateUserSchema, adminUpdateUserSchema, changePasswordSchema, verifyPasswordSchema } = require("./user.schema");
const upload = require("../../middlewares/upload.middleware");
const numericParam = require("../../middlewares/validations/objectId.middleware");

const router = express.Router();

// Picks the admin/operator (broader) schema when the requester is an admin or operator, otherwise the self-editable subset
const validateUpdate = (req, res, next) => {
  const schema = (req.user.role === "admin" || req.user.role === "operator") ? adminUpdateUserSchema.concat(updateUserSchema) : updateUserSchema;
  return validate(schema)(req, res, next);
};

router.use(authenticate);

router.post("/profile-photo", upload.single("photo"), userController.uploadProfilePhoto);
router.put("/me/password", validate(changePasswordSchema), userController.changePassword);
router.post("/me/verify-password", validate(verifyPasswordSchema), userController.verifyPassword);
router.get("/me", userController.getSelf);
router.get("/", authorize("admin", "operator"), userController.list);
router.get("/export", authorize("admin", "operator"), userController.exportCsv);
router.get("/:id", numericParam("id"), authorize("admin", "operator"), userController.getById);
router.post("/", authorize("admin", "operator"), validate(createUserSchema), userController.create);
router.put("/:id", numericParam("id"), validateUpdate, userController.update);
router.delete("/:id", numericParam("id"), authorize("admin", "operator"), userController.remove);

module.exports = router;
