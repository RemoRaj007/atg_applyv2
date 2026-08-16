const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const ApiError = require("../../utils/ApiError");
const profileSchemaService = require("./profileSchema.service");

const getSchema = asyncHandler(async (_req, res) => {
  const chapters = await profileSchemaService.getSchema();
  sendSuccess(res, { message: "Profile schema retrieved", data: { chapters } });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await profileSchemaService.getProfile(req.user.id, {
    viewerRole: req.user.role,
    isSelf: true,
  });
  sendSuccess(res, { message: "Profile retrieved", data: profile });
});

const patchMyFields = asyncHandler(async (req, res) => {
  const written = await profileSchemaService.patchFields({
    userId: req.user.id,
    actorId: req.user.id,
    // Candidate edits are always recorded as candidate-sourced. A client cannot
    // claim its write came from an import or an operator request — that would
    // let a candidate mark their own answer as operator-verified.
    updates: req.body.updates.map((u) => ({ ...u, source: "candidate" })),
  });
  sendSuccess(res, { message: "Profile saved", data: { written } });
});

const removeMyEntry = asyncHandler(async (req, res) => {
  const repeatIndex = Number(req.params.repeatIndex);
  if (!Number.isInteger(repeatIndex) || repeatIndex < 0) {
    throw ApiError.badRequest("repeatIndex must be a non-negative integer.");
  }
  await profileSchemaService.removeEntry({
    userId: req.user.id,
    code: req.params.code,
    repeatIndex,
  });
  sendSuccess(res, { message: "Entry removed" });
});

const submitForReview = asyncHandler(async (req, res) => {
  const result = await profileSchemaService.submitForReview({
    userId: req.user.id,
    notes: req.body.notes,
  });
  sendSuccess(res, { message: "Profile submitted for review", data: result });
});

/**
 * The operator's read-only view of a candidate's profile.
 *
 * Separate from getMyProfile because the two differ in what they are allowed to
 * return, not just in whose id they take: this path passes isSelf false, which
 * withholds RESTRICTED values from anyone who is not the owner or an admin.
 */
const getUserProfileForStaff = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const profile = await profileSchemaService.getProfile(userId, {
    viewerRole: req.user.role,
    isSelf: req.user.id === userId,
    accessedBy: req.user.id,
  });
  sendSuccess(res, { message: "Candidate profile retrieved", data: profile });
});

module.exports = {
  getSchema,
  getMyProfile,
  patchMyFields,
  removeMyEntry,
  submitForReview,
  getUserProfileForStaff,
};
