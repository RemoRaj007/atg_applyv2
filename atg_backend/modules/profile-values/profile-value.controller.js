const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const profileValueService = require("./profile-value.service");
const profileColumnService = require("../profile-columns/profile-column.service");
const resolveFileUrl = require("../../utils/fileUrl");

const getByUserId = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId || req.user.id);
  
  // A candidate can only see their own values; admins/operators can see anyone's
  if (req.user.role === "candidate" && req.user.id !== userId) {
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
