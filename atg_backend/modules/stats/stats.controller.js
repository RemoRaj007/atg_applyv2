const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const statsService = require("./stats.service");

const adminOverview = asyncHandler(async (req, res) => {
  const stats = await statsService.adminOverview();
  sendSuccess(res, { message: "Admin overview retrieved", data: stats });
});

const revenueTrend = asyncHandler(async (req, res) => {
  const trend = await statsService.revenueTrend(req.query.limit);
  sendSuccess(res, { message: "Revenue trend retrieved", data: { trend } });
});

module.exports = { adminOverview, revenueTrend };
