const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const teamService = require("./team.service");
const { toCsv } = require("../../utils/csv");

const getCapacity = asyncHandler(async (req, res) => {
  const operators = await teamService.getCapacity();
  sendSuccess(res, { message: "Team capacity retrieved", data: { operators } });
});

const exportCsv = asyncHandler(async (req, res) => {
  const data = await teamService.exportAll(req.user);
  const csv = toCsv(data, [
    { label: "Name", value: (o) => o.name },
    { label: "Role", value: (o) => o.role },
    { label: "Email", value: (o) => o.email },
    { label: "Max Capacity", value: (o) => o.capacity },
    { label: "Current Load", value: (o) => o.activeLoad },
  ]);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="staff-capacity-export-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = { getCapacity, exportCsv };
