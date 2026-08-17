const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

/**
 * The schema-driven master profile.
 *
 * Replaces the arrangement where the candidate profile page carried its own
 * eight hard-coded steps while administrators edited a ProfileColumn table
 * nothing rendered. There is one schema now: a field added to a chapter appears
 * in the candidate builder and in the operator's view without a frontend change.
 */

const SENSITIVITY = Object.freeze(["CAREER", "PRIVATE", "SENSITIVE", "RESTRICTED"]);
const AI_POLICY = Object.freeze(["YES", "LIMITED", "NO"]);

// Sensitivity levels an operator may read in the ordinary profile view.
// RESTRICTED is deliberately excluded: it is just-in-time access for a named
// need, not something to render on every profile open.
const OPERATOR_VISIBLE_SENSITIVITY = Object.freeze(["CAREER", "PRIVATE", "SENSITIVE"]);

const parseJson = (raw, fallback = null) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const toFieldDto = (column) => ({
  id: column.id,
  code: column.code,
  label: column.label,
  helpText: column.helpText,
  inputType: column.inputType,
  required: column.isRequired,
  sensitivity: column.sensitivity,
  externalAiPolicy: column.externalAiPolicy,
  defaultApplicationUse: column.defaultApplicationUse,
  purpose: column.purpose,
  repeatableGroup: column.repeatableGroup,
  sortOrder: column.sortOrder,
  options: parseJson(column.options, null),
  validation: parseJson(column.validation, null),
});

/** The 20 chapters and their fields, ordered. Identical for every role. */
const getSchema = async () => {
  const sections = await prisma.profileSection.findMany({
    where: { active: true, d_status: "active" },
    orderBy: { sortOrder: "asc" },
    include: {
      fields: {
        where: { active: true, d_status: "active" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return sections.map((section) => ({
    code: section.code,
    title: section.title,
    description: section.description,
    fields: section.fields.map(toFieldDto),
  }));
};

/**
 * Completion per chapter, computed here rather than in the browser.
 *
 * The brief asks for completion to be consistent and server-calculated: an
 * arbitrary "step 3 of 8" score in the frontend cannot stay in agreement with
 * what the operator sees, and two different numbers for the same profile is
 * worse than none.
 */
const summarise = (sections, valuesByColumn) => {
  const isFilled = (columnId) =>
    (valuesByColumn.get(columnId) || []).some((v) => String(v.value ?? "").trim() !== "");

  return sections.map((section) => {
    const total = section.fields.length;
    const required = section.fields.filter((f) => f.required);
    const filled = section.fields.filter((f) => isFilled(f.id)).length;
    const requiredMissing = required.filter((f) => !isFilled(f.id)).map((f) => f.code);

    let status = "not_started";
    if (requiredMissing.length > 0 && filled > 0) status = "needs_review";
    else if (requiredMissing.length > 0) status = "not_started";
    else if (filled === 0) status = "not_started";
    else if (filled === total) status = "complete";
    else status = "in_progress";

    return {
      code: section.code,
      title: section.title,
      total,
      filled,
      requiredMissing,
      status,
    };
  });
};

const loadValues = async (userId) => {
  const values = await prisma.profileValue.findMany({
    where: { userId, d_status: "active" },
    orderBy: [{ columnId: "asc" }, { repeatIndex: "asc" }],
  });
  const byColumn = new Map();
  for (const value of values) {
    if (!byColumn.has(value.columnId)) byColumn.set(value.columnId, []);
    byColumn.get(value.columnId).push(value);
  }
  return byColumn;
};

/**
 * A user's own profile: schema plus their values plus completion.
 * `viewerRole` decides whether RESTRICTED values are included.
 */
const getProfile = async (userId, { viewerRole = "candidate", isSelf = true, accessedBy = null } = {}) => {
  const sections = await getSchema();
  const valuesByColumn = await loadValues(userId);

  const redactRestricted = !isSelf && viewerRole !== "admin";

  // Somebody other than the owner opened this profile. That is a normal part of
  // the manual workflow, and it is also exactly the event that has to be
  // attributable afterwards, so it is logged with who and whose — never with
  // any of the values themselves.
  if (!isSelf && accessedBy) {
    activityLogger.activity("Candidate profile opened by staff", {
      userId,
      accessedBy,
      viewerRole,
      restrictedRedacted: redactRestricted,
    });
  }

  const chapters = sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      const entries = valuesByColumn.get(field.id) || [];
      // Policy is enforced here, not merely displayed: a RESTRICTED value is
      // not serialised at all for a viewer who is not the owner or an admin, so
      // it cannot leak through a client that ignores a `hidden` flag.
      const gated = redactRestricted && field.sensitivity === "RESTRICTED";
      return {
        ...field,
        gated,
        values: gated
          ? []
          : entries.map((v) => ({
              repeatIndex: v.repeatIndex,
              value: v.value,
              source: v.source,
              verified: v.verified,
              verifiedAt: v.verifiedAt,
              updatedAt: v.updatedAt,
            })),
      };
    }),
  }));

  return { chapters, completion: summarise(sections, valuesByColumn) };
};

/**
 * Writes one field value (one repeatable entry at a time), which is what makes
 * autosave possible without shipping the whole profile on every keystroke.
 */
const patchFields = async ({ userId, actorId, updates }) => {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw ApiError.badRequest("No field updates were provided.");
  }

  const codes = [...new Set(updates.map((u) => u.code))];
  const columns = await prisma.profileColumn.findMany({
    where: { code: { in: codes }, active: true, d_status: "active" },
  });
  const byCode = new Map(columns.map((c) => [c.code, c]));

  // Unknown codes are rejected rather than ignored, so a typo in a field code
  // fails loudly instead of silently discarding what the candidate typed.
  const unknown = codes.filter((code) => !byCode.has(code));
  if (unknown.length) {
    throw ApiError.badRequest(`Unknown profile field code(s): ${unknown.join(", ")}`);
  }

  const written = [];
  for (const update of updates) {
    const column = byCode.get(update.code);
    const repeatIndex = Number.isInteger(update.repeatIndex) ? update.repeatIndex : 0;
    if (repeatIndex < 0) throw ApiError.badRequest("repeatIndex cannot be negative.");
    if (repeatIndex > 0 && !column.repeatableGroup) {
      throw ApiError.badRequest(`Field ${column.code} is not repeatable.`);
    }

    const value = update.value === null || update.value === undefined ? "" : String(update.value);

    const row = await prisma.profileValue.upsert({
      where: { userId_columnId_repeatIndex: { userId, columnId: column.id, repeatIndex } },
      update: { value, updatedById: actorId, source: update.source || "candidate" },
      create: {
        userId,
        columnId: column.id,
        repeatIndex,
        value,
        updatedById: actorId,
        source: update.source || "candidate",
      },
    });
    written.push({ code: column.code, repeatIndex, updatedAt: row.updatedAt });
  }

  // The value itself is deliberately not logged: this table holds career and
  // private data, and an activity log is a much wider audience than the profile.
  activityLogger.activity("Profile fields updated", {
    userId,
    actorId,
    codes: written.map((w) => w.code),
  });

  return written;
};

/** Deletes one entry of a repeatable group (an education row, a referee). */
const removeEntry = async ({ userId, code, repeatIndex }) => {
  const column = await prisma.profileColumn.findFirst({ where: { code, d_status: "active" } });
  if (!column) throw ApiError.notFound(`Unknown profile field code: ${code}`);

  await prisma.profileValue.deleteMany({ where: { userId, columnId: column.id, repeatIndex } });
  activityLogger.activity("Profile entry removed", { userId, code, repeatIndex });
};

/**
 * Records that the candidate considers the profile ready for operational use,
 * and returns the completion the server computed at that moment.
 *
 * Chapter 19 asks the candidate to list facts that still need verification
 * rather than guessing at them, so those notes are stored against FINAL-01 —
 * the catalogue field that exists for exactly this — instead of in a parallel
 * table the operator view would have to learn about separately.
 */
const submitForReview = async ({ userId, notes }) => {
  if (notes !== undefined && notes !== null && String(notes).trim() !== "") {
    const column = await prisma.profileColumn.findFirst({
      where: { code: "FINAL-01", d_status: "active" },
    });
    if (column) {
      await prisma.profileValue.upsert({
        where: { userId_columnId_repeatIndex: { userId, columnId: column.id, repeatIndex: 0 } },
        update: { value: String(notes), updatedById: userId },
        create: { userId, columnId: column.id, repeatIndex: 0, value: String(notes), updatedById: userId },
      });
    }
  }

  const sections = await getSchema();
  const valuesByColumn = await loadValues(userId);
  const completion = summarise(sections, valuesByColumn);

  // Required fields are the operating minimum from the brief — identity,
  // consent and the declarations. Everything else is optional by design, so a
  // profile is submittable while most chapters are still empty.
  const blocking = completion.flatMap((chapter) => chapter.requiredMissing);
  if (blocking.length) {
    throw ApiError.badRequest(
      `These required fields are still empty: ${blocking.join(", ")}`
    );
  }

  activityLogger.activity("Profile submitted for review", { userId });
  return { completion, submittedAt: new Date() };
};

/**
 * Asks the candidate to correct a value, rather than an operator changing it.
 *
 * This is the whole point of the flow: candidate facts stay the candidate's.
 * An operator who believes a date is wrong raises a request the candidate acts
 * on, which leaves an auditable trail and cannot silently rewrite their history.
 * Reuses ChangeRequest — the approval plumbing already exists.
 */
const requestCorrection = async ({ userId, operatorId, code, reason }) => {
  const column = await prisma.profileColumn.findFirst({ where: { code, d_status: "active" } });
  if (!column) throw ApiError.notFound(`Unknown profile field code: ${code}`);

  const request = await prisma.changeRequest.create({
    data: {
      type: "profile_correction",
      targetId: userId,
      reason,
      details: JSON.stringify({ fieldCode: code, label: column.label }),
      createdById: operatorId,
    },
  });

  activityLogger.activity("Profile correction requested", { userId, operatorId, code });
  return request;
};

const listCorrections = async (userId) =>
  prisma.changeRequest.findMany({
    where: { type: "profile_correction", targetId: userId, d_status: "active" },
    orderBy: { createdAt: "desc" },
  });

/** Private operator notes. Never returned to the candidate. */
const addNote = async ({ userId, authorId, fieldCode, body }) => {
  const note = await prisma.profileNote.create({ data: { userId, authorId, fieldCode: fieldCode || null, body } });
  activityLogger.activity("Profile note added", { userId, authorId, fieldCode: fieldCode || null });
  return note;
};

const listNotes = async (userId) =>
  prisma.profileNote.findMany({
    where: { userId, d_status: "active" },
    orderBy: { createdAt: "desc" },
  });

/**
 * The fields that may be handed to an external AI service, given a policy.
 *
 * Exists so no caller has to remember the rule: anything marked NO is dropped,
 * and LIMITED is only included when the caller explicitly opts into it. The
 * brief requires this to be unavoidable server-side rather than a convention.
 */
const selectAiEligible = (chapters, { includeLimited = false } = {}) => {
  const allowed = includeLimited ? ["YES", "LIMITED"] : ["YES"];
  return chapters.flatMap((chapter) =>
    chapter.fields
      .filter((field) => allowed.includes(field.externalAiPolicy) && field.sensitivity !== "RESTRICTED")
      .map((field) => ({ code: field.code, label: field.label, values: field.values }))
  );
};

module.exports = {
  SENSITIVITY,
  AI_POLICY,
  OPERATOR_VISIBLE_SENSITIVITY,
  getSchema,
  getProfile,
  patchFields,
  removeEntry,
  submitForReview,
  requestCorrection,
  listCorrections,
  addNote,
  listNotes,
  selectAiEligible,
  summarise,
};
