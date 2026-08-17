const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

// Answers the catalogue marks RESTRICTED are reference contact details,
// passport and clearance data. They belong to the candidate and are read back
// to them, but staff browsing a profile do not need them to prepare an
// application, so the operator view drops them.
const STAFF_HIDDEN_SENSITIVITY = ["RESTRICTED"];

const parseJson = (raw, fallback = null) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const toField = (column) => ({
  id: column.id,
  code: column.code,
  label: column.label,
  inputType: column.inputType,
  isRequired: column.isRequired,
  helpText: column.helpText,
  purpose: column.purpose,
  sensitivity: column.sensitivity,
  externalAiPolicy: column.externalAiPolicy,
  defaultApplicationUse: column.defaultApplicationUse,
  options: parseJson(column.options, null),
  validation: parseJson(column.validation, null),
  repeatableGroup: column.repeatableGroup,
  sortOrder: column.sortOrder,
});

/**
 * The 20 chapters with their questions, ordered as the catalogue orders them.
 * Only catalogue-backed columns are returned: the admin-managed ProfileColumn
 * rows that predate the catalogue have no section and are served by the older
 * /api/profile-columns endpoint.
 */
const getSchema = async () => {
  const sections = await prisma.profileSection.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      columns: {
        where: { active: true, d_status: "active" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return sections.map((section) => ({
    id: section.id,
    code: section.code,
    title: section.title,
    sortOrder: section.sortOrder,
    fields: section.columns.map(toField),
  }));
};

/**
 * A candidate's answers, keyed by field code so the frontend never has to hold
 * database ids. Repeatable groups come back as arrays indexed by entry.
 */
const getValues = async (userId, { forStaff = false } = {}) => {
  const rows = await prisma.profileValue.findMany({
    where: {
      userId,
      d_status: "active",
      column: { active: true, d_status: "active", code: { not: null } },
    },
    include: { column: true },
    orderBy: { repeatIndex: "asc" },
  });

  const values = {};
  for (const row of rows) {
    if (forStaff && STAFF_HIDDEN_SENSITIVITY.includes(row.column.sensitivity)) continue;
    const code = row.column.code;
    if (row.column.repeatableGroup) {
      values[code] = values[code] || [];
      values[code][row.repeatIndex] = row.value;
    } else {
      values[code] = row.value;
    }
  }
  return values;
};

const MAX_VALUE_LENGTH = 20000;
const MAX_REPEAT_INDEX = 49;

/**
 * Saves a partial set of answers. The builder autosaves one chapter at a time,
 * so this patches the codes it is given and leaves every other answer alone —
 * it is never a full-profile replace.
 *
 * Each entry is { code, value, repeatIndex }. An empty value deletes the answer
 * rather than storing "", so a cleared field does not read back as answered.
 */
const patchValues = async (userId, entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest("No values supplied");
  }

  const codes = [...new Set(entries.map((entry) => String(entry.code || "")))].filter(Boolean);
  const columns = await prisma.profileColumn.findMany({
    where: { code: { in: codes }, active: true, d_status: "active" },
  });
  const columnByCode = new Map(columns.map((column) => [column.code, column]));

  const writes = [];
  const deletes = [];

  for (const entry of entries) {
    const column = columnByCode.get(String(entry.code || ""));
    // An unknown code is dropped rather than rejected: the catalogue can be
    // re-seeded while a candidate has the builder open, and one stale field
    // should not fail the whole chapter's save.
    if (!column) continue;

    const repeatIndex = Number(entry.repeatIndex || 0);
    if (!Number.isInteger(repeatIndex) || repeatIndex < 0 || repeatIndex > MAX_REPEAT_INDEX) {
      throw ApiError.badRequest(`Invalid entry number for ${column.code}`);
    }
    // Only repeatable questions get more than one entry; anything else would
    // create rows the reader collapses into a single answer.
    if (repeatIndex > 0 && !column.repeatableGroup) {
      throw ApiError.badRequest(`${column.code} is not a repeatable question`);
    }

    const value = entry.value === null || entry.value === undefined ? "" : String(entry.value);
    if (value.length > MAX_VALUE_LENGTH) {
      throw ApiError.badRequest(`Answer for ${column.code} is too long`);
    }

    const where = { userId_columnId_repeatIndex: { userId, columnId: column.id, repeatIndex } };
    if (value.trim() === "") {
      deletes.push(prisma.profileValue.deleteMany({ where: { userId, columnId: column.id, repeatIndex } }));
    } else {
      writes.push(
        prisma.profileValue.upsert({
          where,
          update: { value, d_status: "active" },
          create: { userId, columnId: column.id, repeatIndex, value },
        })
      );
    }
  }

  if (writes.length === 0 && deletes.length === 0) {
    throw ApiError.badRequest("No recognised field codes supplied");
  }

  await prisma.$transaction([...deletes, ...writes]);
  // Field codes only. The answers themselves are the candidate's private data
  // and several are RESTRICTED, so they must not reach the activity log.
  activityLogger.activity("Profile fields updated", {
    userId,
    codes: entries.map((entry) => entry.code).filter(Boolean),
  });

  return { saved: writes.length, cleared: deletes.length };
};

/**
 * Completion per chapter, so the builder can show progress without pulling the
 * whole catalogue into the client. Required questions drive the "complete"
 * flag; optional ones only count toward the answered tally.
 */
const getProgress = async (userId) => {
  const [sections, values] = await Promise.all([getSchema(), getValues(userId)]);

  return sections.map((section) => {
    const answered = section.fields.filter((field) => {
      const value = values[field.code];
      return Array.isArray(value) ? value.some((entry) => entry && entry.trim()) : value && value.trim();
    }).length;
    const required = section.fields.filter((field) => field.isRequired);
    const requiredAnswered = required.filter((field) => {
      const value = values[field.code];
      return Array.isArray(value) ? value.some((entry) => entry && entry.trim()) : value && value.trim();
    }).length;

    return {
      code: section.code,
      title: section.title,
      total: section.fields.length,
      answered,
      requiredTotal: required.length,
      requiredAnswered,
      complete: required.length > 0 ? requiredAnswered === required.length : answered > 0,
    };
  });
};

module.exports = { getSchema, getValues, patchValues, getProgress, toField };
