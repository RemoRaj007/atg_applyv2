const COLUMN_FIELD = /^column_(\d+)$/;
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const jobFormService = require("./job-form.service");
const jobService = require("../jobs/job.service");
const applicationService = require("../applications/application.service");
const resolveFileUrl = require("../../utils/fileUrl");

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
  // A Map keyed by the column id, not an object keyed by the field name.
  // `file.fieldname` is chosen by whoever built the multipart request, so using
  // it as a property name lets `__proto__`/`constructor` reach Object.prototype
  // (js/remote-property-injection). Parsing the id out and storing it as a
  // number means no attacker-controlled string is ever used as a key, and a
  // field that is not `column_<id>` is dropped rather than stored.
  const filesMap = new Map();
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((file) => {
      const match = COLUMN_FIELD.exec(String(file.fieldname));
      if (!match) return;
      filesMap.set(Number(match[1]), resolveFileUrl(file));
    });
  }

  for (const col of columns) {
    const key = `column_${col.id}`;
    let val = null;

    if (col.inputType === "file") {
      if (filesMap.has(col.id)) {
        val = filesMap.get(col.id);
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
