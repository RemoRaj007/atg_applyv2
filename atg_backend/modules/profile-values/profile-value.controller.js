const COLUMN_FIELD = /^column_(\d+)$/;
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

  // Pass the viewer so restricted values are withheld from staff reading
  // someone else's profile. Without this the endpoint returned every value it
  // had, including the ones the schema marks release-on-approval only.
  const values = await profileValueService.getByUserId(userId, {
    id: req.user.id,
    role: req.user.role,
  });
  sendSuccess(res, { message: "Profile values retrieved", data: { values } });
});

const saveValues = asyncHandler(async (req, res) => {
  const userId = req.user.id; // always save for self (candidate)
  const columns = await profileColumnService.list();
  
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

  // Check columns and grab data from req.body and filesMap
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

  const saved = await profileValueService.saveValues(userId, valuesToSave);
  sendSuccess(res, { message: "Profile values saved successfully", data: { saved } });
});

module.exports = { getByUserId, saveValues };
