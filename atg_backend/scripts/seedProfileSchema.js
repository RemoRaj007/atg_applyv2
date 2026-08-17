/**
 * Seeds the 20 chapters and every field code of the ATG Apply question
 * catalogue into ProfileSection / ProfileColumn.
 *
 * data/profile-catalog.csv is the source of truth. The catalogue carries all 20
 * chapters and every stable field code: those codes are the migration and API
 * keys, so the schema must not be reduced to the eight hard-coded steps the
 * candidate profile page used to have. The UI may still reveal chapters
 * progressively.
 *
 * Idempotent: re-running updates the wording and metadata of existing codes
 * rather than duplicating them, so the catalogue can be re-seeded after an
 * edit. Candidate answers live in ProfileValue keyed by column id and are
 * never touched here.
 *
 * Run: node scripts/seedProfileSchema.js [--dry-run]
 */

// Loaded before config/db so the standalone run has DATABASE_URL. Requiring
// this module from prisma/seed.js is unaffected — dotenv only fills in
// variables the environment has not already set.
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { prisma } = require("../config/db");
const { parseCsv } = require("./importScholarships");

const CATALOG_PATH = path.join(__dirname, "..", "data", "profile-catalog.csv");

const EXPECTED_CHAPTERS = 20;

// Chapter labels read "03 — Career direction & opportunity rules". The numeric
// prefix is the stable chapter code; the rest is the title.
const splitSection = (raw) => {
  const match = /^(\d{2})\s*[—–-]\s*(.+)$/.exec(String(raw || "").trim());
  return match ? { code: match[1], title: match[2].trim() } : null;
};

// "Short answer" / "Paragraph" / "Multiple choice" / "Checkboxes" is the form
// vocabulary; the renderer speaks in input types.
const INPUT_TYPES = {
  "short answer": "text",
  paragraph: "textarea",
  "multiple choice": "select",
  checkboxes: "multiselect",
};

// Fields whose codes carry an entry number belong to a repeatable group, so the
// builder can offer "Add education" rather than three fixed copies of the same
// questions. EDU1-01/EDU2-01/EDU3-01 are one question, not three.
const REPEATABLE_GROUPS = [
  { pattern: /^EDU(\d)-(\d+)$/, group: "education" },
  { pattern: /^EXP(\d)-(\d+)$/, group: "employment" },
  { pattern: /^PROJ(\d)-(\d+)$/, group: "project" },
  { pattern: /^REF(\d)-(\d+)$/, group: "reference" },
];

const classifyCode = (code) => {
  for (const { pattern, group } of REPEATABLE_GROUPS) {
    const match = pattern.exec(code);
    // Only the first entry of a group is seeded. Entries 2..n repeat the same
    // questions, and repetition is ProfileValue.repeatIndex's job rather than a
    // duplicated column, so `skip` drops them.
    if (match) {
      return { group, entry: Number(match[1]), skip: Number(match[1]) > 1 };
    }
  }
  return { group: null, entry: 0, skip: false };
};

// "Education 1 — institution and country" reads oddly on a repeatable card that
// is already labelled "Education 2", so the entry number comes off the label.
// What remains started mid-sentence, so it is recapitalised to stand alone.
const stripEntryNumber = (label) => {
  const stripped = label.replace(/^(Education|Experience|Project|Reference)\s+\d+\s*[—–-]\s*/i, "").trim();
  if (stripped === label) return stripped;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
};

const parseOptions = (raw) => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  return JSON.stringify(trimmed.split("|").map((option) => option.trim()).filter(Boolean));
};

const parseValidation = (raw) => {
  const trimmed = String(raw || "").trim();
  return trimmed ? JSON.stringify({ format: trimmed }) : null;
};

function readCatalog(csvPath = CATALOG_PATH) {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (rows.length < 2) throw new Error(`Catalogue at ${csvPath} has no rows.`);

  const sections = new Map();
  const fields = [];
  const seenCodes = new Set();

  for (const cells of rows.slice(1)) {
    const [code, sectionRaw, question, type, required, sensitivity, externalAi, use, purpose, helpText, options, validation] =
      cells;
    if (!code) continue;

    const section = splitSection(sectionRaw);
    if (!section) throw new Error(`Field ${code} has an unrecognised section: "${sectionRaw}"`);
    if (!sections.has(section.code)) {
      sections.set(section.code, { ...section, sortOrder: Number(section.code) });
    }

    const { group, skip } = classifyCode(code);
    if (skip) continue;
    if (seenCodes.has(code)) throw new Error(`Duplicate field code in catalogue: ${code}`);
    seenCodes.add(code);

    fields.push({
      code,
      sectionCode: section.code,
      label: group ? stripEntryNumber(question) : question,
      inputType: INPUT_TYPES[String(type || "").trim().toLowerCase()] || "text",
      isRequired: String(required || "").trim().toLowerCase() === "yes",
      sensitivity: String(sensitivity || "CAREER").trim().toUpperCase(),
      externalAiPolicy: String(externalAi || "NO").trim().toUpperCase(),
      defaultApplicationUse: use || null,
      purpose: purpose || null,
      helpText: helpText || null,
      options: parseOptions(options),
      validation: parseValidation(validation),
      repeatableGroup: group,
      sortOrder: fields.length,
    });
  }

  return { sections: [...sections.values()].sort((a, b) => a.sortOrder - b.sortOrder), fields };
}

async function seedProfileSchema({ dryRun = false } = {}) {
  const { sections, fields } = readCatalog();

  // A truncated catalogue would silently delete chapters from every candidate's
  // profile, so a short read fails instead of seeding a partial questionnaire.
  if (sections.length !== EXPECTED_CHAPTERS) {
    throw new Error(
      `Expected ${EXPECTED_CHAPTERS} chapters, found ${sections.length}. Refusing to seed a partial catalogue.`
    );
  }
  if (dryRun) {
    console.log(`Dry run — ${sections.length} chapters, ${fields.length} questions. Nothing written.`);
    return { sections: sections.length, fields: fields.length };
  }

  const sectionIdByCode = new Map();
  for (const section of sections) {
    const row = await prisma.profileSection.upsert({
      where: { code: section.code },
      update: { title: section.title, sortOrder: section.sortOrder, active: true },
      create: { code: section.code, title: section.title, sortOrder: section.sortOrder },
    });
    sectionIdByCode.set(section.code, row.id);
  }

  for (const field of fields) {
    const { sectionCode, ...rest } = field;
    const data = { ...rest, sectionId: sectionIdByCode.get(sectionCode), active: true };
    await prisma.profileColumn.upsert({
      where: { code: field.code },
      update: data,
      // `name` predates the catalogue and is separately unique, so it is seeded
      // from the code to keep both constraints satisfied.
      create: { ...data, name: field.code, status: "active" },
    });
  }

  console.log(`Seeded ${sections.length} chapters and ${fields.length} questions.`);
  return { sections: sections.length, fields: fields.length };
}

if (require.main === module) {
  seedProfileSchema({ dryRun: process.argv.includes("--dry-run") })
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seedProfileSchema, readCatalog, classifyCode, stripEntryNumber, splitSection };
