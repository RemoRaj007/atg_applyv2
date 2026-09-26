const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const aiService = require("./ai.service");

const getStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await aiService.status(req.user.id) });
});

const getPreview = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await aiService.preview(req.user.id) });
});

const draftApplication = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: "Draft generated", data: await aiService.draftApplication(req.user.id, req.body) });
});

const explainFit = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: "Fit explained", data: await aiService.explainFit(req.user.id, req.body) });
});

const polishAnswer = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: "Answer improved", data: await aiService.polishAnswer(req.user.id, req.body) });
});

module.exports = { getStatus, getPreview, draftApplication, explainFit, polishAnswer };
