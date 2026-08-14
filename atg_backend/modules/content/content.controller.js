const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const contentService = require("./content.service");

// ─── Public (no token) ───────────────────────────────────────────────────────

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await contentService.publicSettings();
  sendSuccess(res, { message: "Public settings retrieved", data: { settings } });
});

const getPublicContent = asyncHandler(async (req, res) => {
  const content = await contentService.publicContent(req.params.page);
  sendSuccess(res, { message: "Page content retrieved", data: { page: req.params.page, content } });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

const listSettings = asyncHandler(async (req, res) => {
  const settings = await contentService.listSettings({ group: req.query.group });
  sendSuccess(res, { message: "Settings retrieved", data: { settings } });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await contentService.updateSettings(req.body.settings, req.user);
  sendSuccess(res, { message: "Settings saved", data: { settings } });
});

const listContent = asyncHandler(async (req, res) => {
  const content = await contentService.listContent({ page: req.query.page });
  sendSuccess(res, { message: "Content retrieved", data: { content } });
});

const updateContent = asyncHandler(async (req, res) => {
  const content = await contentService.updateContentBlocks(req.body.blocks, req.user);
  sendSuccess(res, { message: "Content saved", data: { content } });
});

const resetContent = asyncHandler(async (req, res) => {
  const content = await contentService.resetContentPage(req.params.page, req.user);
  sendSuccess(res, { message: "Page restored to its shipped copy", data: { content } });
});

const listTemplates = asyncHandler(async (req, res) => {
  const templates = await contentService.listTemplates();
  sendSuccess(res, { message: "Email templates retrieved", data: { templates } });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await contentService.updateTemplate(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "Email template saved", data: { template } });
});

const resetTemplate = asyncHandler(async (req, res) => {
  const template = await contentService.resetTemplate(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Template restored to its shipped copy", data: { template } });
});

const seed = asyncHandler(async (req, res) => {
  const result = await contentService.seedDefaults();
  sendSuccess(res, { message: "Defaults loaded", data: result });
});

module.exports = {
  getPublicSettings,
  getPublicContent,
  listSettings,
  updateSettings,
  listContent,
  updateContent,
  resetContent,
  listTemplates,
  updateTemplate,
  resetTemplate,
  seed,
};
