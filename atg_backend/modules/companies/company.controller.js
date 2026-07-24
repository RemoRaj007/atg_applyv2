const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const companyService = require("./company.service");

const list = asyncHandler(async (req, res) => {
  const companies = await companyService.list();
  sendSuccess(res, { message: "Companies retrieved", data: { companies } });
});

const getById = asyncHandler(async (req, res) => {
  const company = await companyService.getById(Number(req.params.id));
  sendSuccess(res, { message: "Company retrieved", data: { company } });
});

const create = asyncHandler(async (req, res) => {
  const company = await companyService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Company created", data: { company } });
});

const update = asyncHandler(async (req, res) => {
  const company = await companyService.update(Number(req.params.id), req.body);
  sendSuccess(res, { message: "Company updated", data: { company } });
});

const approve = asyncHandler(async (req, res) => {
  const { status } = req.body; // approved, rejected
  const company = await companyService.updateStatus(Number(req.params.id), status);
  sendSuccess(res, { message: `Company registration ${status}`, data: { company } });
});

const remove = asyncHandler(async (req, res) => {
  await companyService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Company deleted" });
});

module.exports = { list, getById, create, update, approve, remove };
