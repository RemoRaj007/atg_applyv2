const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const profileValueService = require("./profile-value.service");
const profileColumnService = require("../profile-columns/profile-column.service");
const resolveFileUrl = require("../../utils/fileUrl");

const getByUserId = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId || req.user.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ status: false, message: "Invalid user id" });
  }

  // Allowlist, not denylist. Naming only `candidate` here meant every other
  // non-staff role — company, visitor — could read any user's profile values,
  // which is where the CV, NIC and contact details live.
  const STAFF_ROLES = ["admin", "operator"];
  if (!STAFF_ROLES.includes(req.user.role) && req.user.id !== userId) {
    return res.status(403).json({ status: false, message: "Forbidden: Access denied" });
  }

  const values = await profileValueService.getByUserId(userId);
  sendSuccess(res, { message: "Profile values retrieved", data: { values } });
});

const saveValues = asyncHandler(async (req, res) => {
  const userId = req.user.id; // always save for self (candidate)
  const columns = await profileColumnService.list();
  
  const valuesToSave = [];

  // Parse files if any
  const filesMap = {};
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(file => {
      filesMap[file.fieldname] = resolveFileUrl(file);
    });
  }

  // Check columns and grab data from req.body and filesMap
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

  const saved = await profileValueService.saveValues(userId, valuesToSave);
  sendSuccess(res, { message: "Profile values saved successfully", data: { saved } });
});

module.exports = { getByUserId, saveValues };
