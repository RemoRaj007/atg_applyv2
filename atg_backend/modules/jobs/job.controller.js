const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const jobService = require("./job.service");

const list = asyncHandler(async (req, res) => {
  const jobs = await jobService.list(req.user);
  sendSuccess(res, { message: "Jobs retrieved", data: { jobs } });
});

const getById = asyncHandler(async (req, res) => {
  const job = await jobService.getById(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Job retrieved", data: { job } });
});

const create = asyncHandler(async (req, res) => {
  const job = await jobService.create(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: "Job created", data: { job } });
});

const update = asyncHandler(async (req, res) => {
  const job = await jobService.update(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "Job updated", data: { job } });
});

const approve = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const job = await jobService.approve(Number(req.params.id), status);
  sendSuccess(res, { message: `Job post ${status}`, data: { job } });
});

const remove = asyncHandler(async (req, res) => {
  await jobService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Job deleted" });
});

const getRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await jobService.getRecommendations(req.user);
  sendSuccess(res, { message: "Recommendations retrieved", data: recommendations });
});

module.exports = { list, getById, create, update, approve, remove, getRecommendations };
