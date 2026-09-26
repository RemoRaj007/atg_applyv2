const { prisma } = require("../../config/db");

// Decides which of a candidate's profile answers may be sent to the external AI
// provider. This file is the privacy boundary for every AI feature: nothing
// reaches a prompt except through shareableProfile().
//
// The rule comes from the question catalogue, not from here. Every question
// carries an externalAiPolicy the catalogue authors set per field:
//
//   YES      sent.
//   LIMITED  sent only when the candidate ticks "include limited details" for
//            that one request — legal name, city, notice period and the like.
//   NO       never sent. Health, identity documents, references, and anything
//            the catalogue did not classify.
//
// Two further rules apply on top, as defence in depth against a catalogue edit:
// RESTRICTED and SENSITIVE answers are never sent whatever their policy says,
// and an unrecognised policy value is treated as NO.

const NEVER_SENT_SENSITIVITY = new Set(["RESTRICTED", "SENSITIVE"]);

// Keeps a prompt inside the model's useful context and bounds cost per call. A
// single long answer is trimmed rather than dropped, so it still contributes.
const MAX_VALUE_CHARS = 1500;
const MAX_TOTAL_CHARS = 14000;

const classify = (column, { includeLimited }) => {
  if (NEVER_SENT_SENSITIVITY.has(column.sensitivity)) return "never";
  const policy = String(column.externalAiPolicy || "").toUpperCase();
  if (policy === "YES") return "shared";
  if (policy === "LIMITED") return includeLimited ? "shared" : "limited";
  return "never";
};

const clip = (text, max) => (text.length > max ? `${text.slice(0, max)}…` : text);

/**
 * The candidate's answers that may leave the platform for this request, plus a
 * count of what was held back so the UI can say so.
 *
 * Returns { fields: [{ code, label, section, value }], withheld: { limited, never } }.
 * Repeatable answers (Education 1, Education 2…) become one field each.
 */
const shareableProfile = async (userId, { includeLimited = false } = {}) => {
  const rows = await prisma.profileValue.findMany({
    where: {
      userId,
      d_status: "active",
      column: { active: true, d_status: "active", code: { not: null } },
    },
    include: { column: { include: { section: true } } },
    orderBy: [{ column: { sortOrder: "asc" } }, { repeatIndex: "asc" }],
  });

  const fields = [];
  const withheld = { limited: 0, never: 0 };
  let budget = MAX_TOTAL_CHARS;

  for (const row of rows) {
    const value = String(row.value ?? "").trim();
    if (!value) continue;

    const verdict = classify(row.column, { includeLimited });
    if (verdict !== "shared") {
      withheld[verdict] += 1;
      continue;
    }
    if (budget <= 0) break;

    const clipped = clip(value, Math.min(MAX_VALUE_CHARS, budget));
    budget -= clipped.length;
    fields.push({
      code: row.column.code,
      label: row.column.repeatableGroup ? `${row.column.label} (entry ${row.repeatIndex + 1})` : row.column.label,
      section: row.column.section?.title || null,
      value: clipped,
    });
  }

  return { fields, withheld };
};

/**
 * What *would* be shared, without values — the consent screen's content. Reads
 * the same rows through the same classify(), so the preview cannot drift from
 * what a request actually sends.
 */
const sharingPreview = async (userId) => {
  const rows = await prisma.profileValue.findMany({
    where: {
      userId,
      d_status: "active",
      column: { active: true, d_status: "active", code: { not: null } },
    },
    include: { column: true },
  });

  const byVerdict = { shared: new Map(), limited: new Map(), never: 0 };
  for (const row of rows) {
    if (!String(row.value ?? "").trim()) continue;
    const verdict = classify(row.column, { includeLimited: false });
    if (verdict === "never") byVerdict.never += 1;
    else byVerdict[verdict].set(row.column.code, row.column.label);
  }

  const list = (map) => [...map].map(([code, label]) => ({ code, label }));
  return { shared: list(byVerdict.shared), limited: list(byVerdict.limited), neverShared: byVerdict.never };
};

/** The single-field check used when polishing one answer. */
const canShareColumn = (column, { includeLimited = false } = {}) =>
  classify(column, { includeLimited }) === "shared";

module.exports = { shareableProfile, sharingPreview, canShareColumn, classify, MAX_TOTAL_CHARS };
