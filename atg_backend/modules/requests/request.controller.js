const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const requestService = require("./request.service");

const list = asyncHandler(async (req, res) => {
  const requests = await requestService.list();
  sendSuccess(res, { message: "Change requests retrieved", data: { requests } });
});

const create = asyncHandler(async (req, res) => {
  const request = await requestService.create(req.body, req.user.id);
  sendSuccess(res, { statusCode: 201, message: "Change request submitted", data: { request } });
});

const approve = asyncHandler(async (req, res) => {
  const request = await requestService.approve(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Change request approved and executed", data: { request } });
});

const reject = asyncHandler(async (req, res) => {
  const request = await requestService.reject(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Change request rejected", data: { request } });
});

module.exports = { list, create, approve, reject };
