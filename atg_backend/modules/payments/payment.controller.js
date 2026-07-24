const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const paymentService = require("./payment.service");
const { toCsv } = require("../../utils/csv");

const list = asyncHandler(async (req, res) => {
  const payments = await paymentService.list(req.user);
  sendSuccess(res, { message: "Payments retrieved", data: { payments } });
});

const getById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getById(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Payment retrieved", data: { payment } });
});

const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.slipUrl = `/uploads/${req.file.filename}`;
  }
  const payment = await paymentService.create(data, req.user);
  sendSuccess(res, { statusCode: 201, message: "Payment created", data: { payment } });
});

const update = asyncHandler(async (req, res) => {
  const payment = await paymentService.update(Number(req.params.id), req.body);
  sendSuccess(res, { message: "Payment updated", data: { payment } });
});

const exportCsv = asyncHandler(async (req, res) => {
  const payments = await paymentService.exportAll(req.user);
  const csv = toCsv(payments, [
    { label: "ID", value: (p) => p.id },
    { label: "User ID", value: (p) => p.userId },
    { label: "Package", value: (p) => p.pkg },
    { label: "Amount", value: (p) => p.amount },
    { label: "Currency", value: (p) => p.currency },
    { label: "Paid", value: (p) => p.paid ? "Yes" : "No" },
    { label: "Method", value: (p) => p.method || "" },
    { label: "Status", value: (p) => p.status },
    { label: "Reference", value: (p) => p.ref || "" },
    { label: "Created At", value: (p) => p.createdAt.toISOString() },
  ]);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="payments-export-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = { list, getById, create, update, exportCsv };
