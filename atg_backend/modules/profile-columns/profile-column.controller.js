const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const profileColumnService = require("./profile-column.service");

const list = asyncHandler(async (req, res) => {
  const columns = await profileColumnService.list();
  sendSuccess(res, { message: "Profile columns retrieved", data: { columns } });
});

const getById = asyncHandler(async (req, res) => {
  const column = await profileColumnService.getById(Number(req.params.id));
  sendSuccess(res, { message: "Profile column retrieved", data: { column } });
});

const create = asyncHandler(async (req, res) => {
  const column = await profileColumnService.create(req.body);
  sendSuccess(res, { statusCode: 201, message: "Profile column created", data: { column } });
});

const update = asyncHandler(async (req, res) => {
  const column = await profileColumnService.update(Number(req.params.id), req.body);
  sendSuccess(res, { message: "Profile column updated", data: { column } });
});

const remove = asyncHandler(async (req, res) => {
  await profileColumnService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Profile column deleted" });
});

module.exports = { list, getById, create, update, remove };
