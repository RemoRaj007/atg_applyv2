const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const ApiError = require("../../utils/ApiError");
const profileSchemaService = require("./profile-schema.service");

const STAFF_ROLES = ["admin", "operator"];

// Allowlist, not denylist: naming only "candidate" here would let every other
// non-staff role — company, visitor — read any candidate's answers.
const resolveTarget = (req) => {
  const requested = req.params.userId ? Number(req.params.userId) : req.user.id;
  if (!Number.isInteger(requested) || requested <= 0) {
    throw ApiError.badRequest("Invalid user id");
  }
  const isStaff = STAFF_ROLES.includes(req.user.role);
  if (!isStaff && req.user.id !== requested) {
    throw ApiError.forbidden();
  }
  return { userId: requested, isStaff: isStaff && req.user.id !== requested };
};

const getSchema = asyncHandler(async (req, res) => {
  const sections = await profileSchemaService.getSchema();
  sendSuccess(res, { message: "Profile schema retrieved", data: { sections } });
});

const getValues = asyncHandler(async (req, res) => {
  const { userId, isStaff } = resolveTarget(req);
  const values = await profileSchemaService.getValues(userId, { forStaff: isStaff });
  sendSuccess(res, { message: "Profile values retrieved", data: { values } });
});

const patchValues = asyncHandler(async (req, res) => {
  // Always the caller's own profile. Staff prepare applications from a
  // candidate's answers but do not author them, so there is no target id here.
  const result = await profileSchemaService.patchValues(req.user.id, req.body.values);
  sendSuccess(res, { message: "Profile saved", data: result });
});

const getProgress = asyncHandler(async (req, res) => {
  const { userId } = resolveTarget(req);
  const progress = await profileSchemaService.getProgress(userId);
  sendSuccess(res, { message: "Profile progress retrieved", data: { progress } });
});

module.exports = { getSchema, getValues, patchValues, getProgress };
