const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const userService = require("./user.service");
const { toCsv } = require("../../utils/csv");
const resolveFileUrl = require("../../utils/fileUrl");

const list = asyncHandler(async (req, res) => {
  const { data, total, page, pageSize, totalPages } = await userService.list(req.query);
  sendSuccess(res, {
    message: "Users retrieved",
    data: { users: data, pagination: { total, page, pageSize, totalPages } },
  });
});

const getSelf = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  sendSuccess(res, { message: "Current user", data: { user } });
});

const getById = asyncHandler(async (req, res) => {
  const user = await userService.getById(Number(req.params.id));
  sendSuccess(res, { message: "User retrieved", data: { user } });
});

const create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: "User created", data: { user } });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.update(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "User updated", data: { user } });
});

const remove = asyncHandler(async (req, res) => {
  await userService.remove(Number(req.params.id), req.user);
  sendSuccess(res, { message: "User deleted" });
});

const exportCsv = asyncHandler(async (req, res) => {
  const users = await userService.exportAll(req.user);
  const csv = toCsv(users, [
    { label: "ID", value: (u) => u.id },
    { label: "Name", value: (u) => u.name },
    { label: "Email", value: (u) => u.email },
    { label: "Phone", value: (u) => u.phone || "" },
    { label: "Country", value: (u) => u.country || "" },
    { label: "City", value: (u) => u.city || "" },
    { label: "Package", value: (u) => u.pkg },
    { label: "Role", value: (u) => u.role },
    { label: "Created At", value: (u) => u.createdAt.toISOString() },
  ]);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="users-export-${Date.now()}.csv"`);
  res.send(csv);
});

const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: false, message: "No file uploaded" });
  }
  const fileUrl = resolveFileUrl(req.file);
  sendSuccess(res, { message: "Profile photo uploaded", data: { fileUrl } });
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  sendSuccess(res, { message: "Password updated successfully" });
});

const verifyPassword = asyncHandler(async (req, res) => {
  const isValid = await userService.verifyPassword(req.user.id, req.body.password);
  sendSuccess(res, { message: "Password checked", data: { isValid } });
});

module.exports = { list, getSelf, getById, create, update, remove, exportCsv, uploadProfilePhoto, changePassword, verifyPassword };
