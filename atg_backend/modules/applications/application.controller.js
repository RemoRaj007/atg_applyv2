const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { toCsv } = require("../../utils/csv");
const applicationService = require("./application.service");
const resolveFileUrl = require("../../utils/fileUrl");

const list = asyncHandler(async (req, res) => {
  const { data, total, page, pageSize, totalPages } = await applicationService.list(req.user, req.query);
  // `applications` stays the array it has always been so unpaginated callers
  // keep working; `pagination` is additive for the callers that opt in.
  sendSuccess(res, {
    message: "Applications retrieved",
    data: { applications: data, pagination: { total, page, pageSize, totalPages } },
  });
});

const getById = asyncHandler(async (req, res) => {
  const application = await applicationService.getById(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Application retrieved", data: { application } });
});

const create = asyncHandler(async (req, res) => {
  const application = await applicationService.create(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: "Application created", data: { application } });
});

// NEW: Candidate submits a job link to operator (no quota consumed)
const createLinkRequest = asyncHandler(async (req, res) => {
  const application = await applicationService.createLinkRequest(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: "Job link request submitted", data: { application } });
});

// NEW: Operator submits fit assessment for link request
const submitFitReview = asyncHandler(async (req, res) => {
  const application = await applicationService.submitFitReview(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "Fit assessment submitted", data: { application } });
});

// NEW: Candidate confirms their application (quota consumed here)
const confirmApply = asyncHandler(async (req, res) => {
  const application = await applicationService.confirmApply(Number(req.params.id), req.user);
  sendSuccess(res, { message: "Application confirmed successfully", data: { application } });
});

const setCandidateApproval = asyncHandler(async (req, res) => {
  const application = await applicationService.setCandidateApproval(Number(req.params.id), req.user, req.body.approved, req.body.comment);
  sendSuccess(res, { message: req.body.approved ? "Application approved" : "Application rejected", data: { application } });
});

const setQcApproval = asyncHandler(async (req, res) => {
  const application = await applicationService.setQcApproval(Number(req.params.id), req.body.approved, req.user);
  sendSuccess(res, { message: "QC approval updated", data: { application } });
});

const book = asyncHandler(async (req, res) => {
  const application = await applicationService.bookApplication(Number(req.params.id), req.user.id);
  sendSuccess(res, { message: "Application booked successfully", data: { application } });
});

const updateStatus = asyncHandler(async (req, res) => {
  if (req.files && req.files.length > 0) {
    req.body.proof = req.files.map((f) => resolveFileUrl(f)).join(",");
    req.body.proofRef = req.files.map(f => f.originalname).join(",");
  } else if (req.file) {
    req.body.proof = resolveFileUrl(req.file);
    req.body.proofRef = req.file.originalname;
  }
  
  // Parse fitScore if present
  if (req.body.fitScore !== undefined) {
    req.body.fitScore = Number(req.body.fitScore);
  }

  const application = await applicationService.updateStatus(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "Application updated", data: { application } });
});

const addComment = asyncHandler(async (req, res) => {
  const application = await applicationService.addComment(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "Comment added", data: { application } });
});

const saveFeedback = asyncHandler(async (req, res) => {
  const application = await applicationService.saveFeedback(Number(req.params.id), req.body, req.user);
  sendSuccess(res, { message: "Feedback saved", data: { application } });
});

const remove = asyncHandler(async (req, res) => {
  await applicationService.remove(Number(req.params.id));
  sendSuccess(res, { message: "Application deleted" });
});

const exportCsv = asyncHandler(async (req, res) => {
  // The requester must be passed through: exportAll narrows an operator to the
  // applications they are staffed on, and without it every operator exported
  // every candidate's record.
  const applications = await applicationService.exportAll(req.user);
  const csv = toCsv(applications, [
    { label: "ID", value: (a) => a.id },
    { label: "Candidate", value: (a) => a.user.name },
    { label: "Candidate Email", value: (a) => a.user.email },
    { label: "Job / Scholarship Title", value: (a) => a.job ? a.job.title : (a.scholarship ? a.scholarship.title : "") },
    { label: "Company / Provider", value: (a) => a.job ? a.job.company : (a.scholarship ? a.scholarship.provider : "") },
    { label: "Job Link Request", value: (a) => a.jobLinkRequest || "" },
    { label: "Staff", value: (a) => a.staff?.name || "" },
    { label: "Status", value: (a) => a.status },
    { label: "Fit Score", value: (a) => a.fitScore ?? "" },
    { label: "Candidate Approval", value: (a) => a.candidateApproval },
    { label: "QC Approval", value: (a) => a.qcApproval },
    { label: "Created At", value: (a) => a.createdAt.toISOString() },
  ]);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="applications-export-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = { list, getById, create, createLinkRequest, submitFitReview, confirmApply, setCandidateApproval, setQcApproval, book, updateStatus, addComment, saveFeedback, remove, exportCsv };
