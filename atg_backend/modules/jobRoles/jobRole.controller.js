const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const jobRoleService = require("./jobRole.service");

const list = asyncHandler(async (req, res) => {
  const jobRoles = await jobRoleService.list();
  sendSuccess(res, { message: "Job Roles retrieved", data: { jobRoles } });
});

const getById = asyncHandler(async (req, res) => {
  const jobRole = await jobRoleService.getById(Number(req.params.id));
  sendSuccess(res, { message: "Job Role retrieved", data: { jobRole } });
});

const create = asyncHandler(async (req, res) => {
  // If a candidate/operator creates a new job role via 'Other', it defaults to 'pending'
  const jobRole = await jobRoleService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Job Role created", data: { jobRole } });
});

const update = asyncHandler(async (req, res) => {
  const jobRole = await jobRoleService.update(Number(req.params.id), req.body);
  sendSuccess(res, { message: "Job Role updated", data: { jobRole } });
});

const remove = asyncHandler(async (req, res) => {
  await jobRoleService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Job Role deleted" });
});

module.exports = { list, getById, create, update, remove };
