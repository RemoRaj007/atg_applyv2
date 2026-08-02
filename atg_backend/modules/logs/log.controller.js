const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { toCsv } = require("../../utils/csv");
const logService = require("./log.service");

const list = asyncHandler(async (req, res) => {
  const { logs, total, limit, offset } = await logService.list(req.query);
  sendSuccess(res, { message: "Logs retrieved", data: { logs, total, limit, offset } });
});

const summary = asyncHandler(async (req, res) => {
  const data = await logService.summary(Number(req.query.days) || 7);
  sendSuccess(res, { message: "Log summary retrieved", data });
});

const exportCsv = asyncHandler(async (req, res) => {
  // Export honours the same filters as the list, capped at the service's page
  // size ceiling so one click cannot pull the whole table into memory.
  const { logs } = await logService.list({ ...req.query, limit: logService.MAX_PAGE_SIZE });

  const csv = toCsv(logs, [
    { label: "ID", value: (l) => l.id },
    { label: "Timestamp", value: (l) => l.createdAt.toISOString() },
    { label: "Category", value: (l) => l.category },
    { label: "Level", value: (l) => l.level },
    { label: "User ID", value: (l) => l.userId ?? "" },
    { label: "Message", value: (l) => l.message },
    { label: "Meta", value: (l) => (l.meta ? JSON.stringify(l.meta) : "") },
  ]);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="logs-export-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = { list, summary, exportCsv };
