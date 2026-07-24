const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const jobFormService = require("./job-form.service");
const jobService = require("../jobs/job.service");
const applicationService = require("../applications/application.service");

const getColumns = asyncHandler(async (req, res) => {
  const jobId = Number(req.params.jobId);
  const columns = await jobFormService.getColumnsByJobId(jobId);
  sendSuccess(res, { message: "Job form columns retrieved", data: { columns } });
});

const saveColumns = asyncHandler(async (req, res) => {
  const jobId = Number(req.params.jobId);
  const { columns } = req.body; // array of { name, label, inputType, isRequired, options }

  // Verify the job exists and user has rights
  const job = await jobService.getById(jobId, req.user);
  if (req.user.role === "company" && job.companyId !== req.user.companyId) {
    return res.status(403).json({ status: false, message: "Forbidden: You do not own this job posting" });
  }

  const saved = await jobFormService.saveColumns(jobId, columns || []);
  sendSuccess(res, { message: "Job form columns updated successfully", data: { columns: saved } });
});

const getValues = asyncHandler(async (req, res) => {
  const applicationId = Number(req.params.applicationId);
  
  // Verify application access
  await applicationService.getById(applicationId, req.user);

  const values = await jobFormService.getValuesByApplicationId(applicationId);
  sendSuccess(res, { message: "Job form values retrieved", data: { values } });
});

const saveValues = asyncHandler(async (req, res) => {
  const applicationId = Number(req.params.applicationId);
  const app = await applicationService.getById(applicationId, req.user);
  
  // Operator/admin can save these values (which are filled and sent to operator to fill)
  if (req.user.role !== "operator" && req.user.role !== "admin") {
    return res.status(403).json({ status: false, message: "Forbidden: Only operators/admins can fill this form" });
  }

  const columns = await jobFormService.getColumnsByJobId(app.jobId);

  const valuesToSave = [];
  const filesMap = {};
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(file => {
      filesMap[file.fieldname] = `/uploads/${file.filename}`;
    });
  }

  for (const col of columns) {
    const key = `column_${col.id}`;
    let val = null;

    if (col.inputType === "file") {
      if (filesMap[key]) {
        val = filesMap[key];
      }
    } else {
      if (req.body[key] !== undefined) {
        val = req.body[key];
      }
    }

    if (val !== null && val !== undefined) {
      valuesToSave.push({
        columnId: col.id,
        value: String(val),
      });
    }
  }

  const saved = await jobFormService.saveValues(applicationId, valuesToSave);
  sendSuccess(res, { message: "Job form values saved successfully", data: { saved } });
});

module.exports = {
  getColumns,
  saveColumns,
  getValues,
  saveValues,
};
