/**
 * Seeds the 20 canonical chapters and every field code from the ATG Apply
 * question catalogue into ProfileSection / ProfileColumn.
 *
 * The catalogue in data/profile-catalog.csv is the source of truth, generated
 * from the ATG Apply One Profile form. The handoff is explicit that it must not
 * be reduced to the eight hard-coded steps the profile page used to have: the
 * UI may reveal questions progressively, but the schema has to carry all 20
 * chapters and every stable field code, because those codes are the migration
 * and API keys.
 *
 * Idempotent: re-running updates the wording and metadata of existing codes
 * rather than duplicating them, so the catalogue can be re-seeded after an
 * edit. Candidate answers live in ProfileValue keyed by column id and are never
 * touched here.
 *
 * Run: node scripts/seedProfileSchema.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const { prisma } = require("../config/db");
const { parseCsv } = require("./importScholarships");

const CATALOG_PATH = path.join(__dirname, "..", "data", "profile-catalog.csv");

// Catalogue section labels are "03 — Career direction & opportunity rules".
// The numeric prefix is the stable chapter code; the rest is the title.
const splitSection = (raw) => {
  const match = /^(\d{2})\s*[—–-]\s*(.+)$/.exec(String(raw || "").trim());
  return match ? { code: match[1], title: match[2].trim() } : null;
};

// "Short answer" / "Paragraph" / "Multiple choice" / "Checkboxes" are the form
// vocabulary; the renderer speaks in input types.
const INPUT_TYPES = {
  "short answer": "text",
  paragraph: "textarea",
  "multiple choice": "select",
  checkboxes: "multiselect",
};

// Fields whose codes carry an entry number belong to a repeatable group, so the
// builder can offer "Add education" rather than three fixed copies of the same
// questions. EDU1-01/EDU2-01/EDU3-01 are one repeatable field, not three.
const REPEATABLE_GROUPS = [
  { pattern: /^EDU(\d)-(\d+)$/, group: "education" },
  { pattern: /^EXP(\d)-(\d+)$/, group: "employment" },
  { pattern: /^PROJ(\d)-(\d+)$/, group: "project" },
  { pattern: /^REF(\d)-(\d+)$/, group: "reference" },
];

const classifyCode = (code) => {
  for (const { pattern, group } of REPEATABLE_GROUPS) {
    const match = pattern.exec(code);
    // Only the first entry of a group is seeded as the schema field; entries 2..n
    // are the same questions repeated, and repetition is ProfileValue.repeatIndex's
    // job, not a duplicated column. Returning `skip` drops the duplicates.
    if (match) {
      return { group, entry: Number(match[1]), skip: Number(match[1]) > 1, baseCode: `${group.toUpperCase()}-${match[2]}` };
    }
  }
  return { group: null, entry: 0, skip: false, baseCode: code };
};

// "Education 1 — institution and country" reads oddly on a repeatable card that
// is already labelled "Education 2". The entry number comes off the label.
const stripEntryNumber = (label) =>
  label.replace(/^(Education|Experience|Project|Reference)\s+\d+\s*[—–-]\s*/i, "").trim();

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
  console.log(`Catalogue: ${sections.length} chapters, ${fields.length} fields.`);

  if (sections.length !== 20) {
    throw new Error(`Expected 20 chapters, found ${sections.length}. Refusing to seed a partial catalogue.`);
  }
  if (dryRun) {
    console.log("Dry run — nothing written.");
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

  console.log(`Seeded ${sections.length} chapters and ${fields.length} fields.`);
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

module.exports = { seedProfileSchema, readCatalog, classifyCode, stripEntryNumber };
