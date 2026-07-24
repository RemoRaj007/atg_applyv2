const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const skillService = require("./skill.service");

const list = asyncHandler(async (req, res) => {
  const skills = await skillService.list();
  sendSuccess(res, { message: "Skills retrieved", data: { skills } });
});

const getById = asyncHandler(async (req, res) => {
  const skill = await skillService.getById(Number(req.params.id));
  sendSuccess(res, { message: "Skill retrieved", data: { skill } });
});

const create = asyncHandler(async (req, res) => {
  const skill = await skillService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Skill created", data: { skill } });
});

const update = asyncHandler(async (req, res) => {
  const skill = await skillService.update(Number(req.params.id), req.body);
  sendSuccess(res, { message: "Skill updated", data: { skill } });
});

const remove = asyncHandler(async (req, res) => {
  await skillService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Skill deleted" });
});

module.exports = { list, getById, create, update, remove };
