const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const scholarshipService = require("./scholarship.service");

const list = asyncHandler(async (req, res) => {
  const scholarships = await scholarshipService.list();
  sendSuccess(res, { message: "Scholarships retrieved", data: { scholarships } });
});

const getById = asyncHandler(async (req, res) => {
  const scholarship = await scholarshipService.getById(Number(req.params.id));
  sendSuccess(res, { message: "Scholarship retrieved", data: { scholarship } });
});

const create = asyncHandler(async (req, res) => {
  const scholarship = await scholarshipService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Scholarship created", data: { scholarship } });
});

const update = asyncHandler(async (req, res) => {
  const scholarship = await scholarshipService.update(Number(req.params.id), req.body);
  sendSuccess(res, { message: "Scholarship updated", data: { scholarship } });
});

const remove = asyncHandler(async (req, res) => {
  await scholarshipService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Scholarship deleted" });
});

module.exports = { list, getById, create, update, remove };
