/**
 * Import scholarship data into the Scholarship table from a CSV produced by
 * the scraper at https://github.com/RaveeshM/scholarship-web-scraper
 * (columns: Scholarship Name, Deadline, Amount, Description, Location, Years, Link).
 *
 * Usage:
 *   node scripts/importScholarships.js [path/to/scholarships.csv] [--dry-run]
 *
 * Defaults to data/scholarships.csv. Rows are matched on title so re-running
 * the import refreshes existing records instead of duplicating them.
 */
const fs = require("fs");
const path = require("path");

// Required lazily so parsing helpers and --dry-run work without a DB connection.
const getPrisma = () => require("../config/db").prisma;

const SOURCE = "collegescholarships.org";

/** Minimal RFC 4180 CSV parser (handles quoted fields, embedded commas/newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);

  return rows;
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&nbsp;": " ",
};

/** The scraper leaves raw HTML ASCII/named entities in names and descriptions. */
function decodeEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/** "25,000" -> 25000. Rows with no award amount are scraped as "v" or empty. */
function parseAmount(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number.parseFloat(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Deadlines are scraped as day-month with no year ("28-Feb"), or as free text
 * ("Rolling", "Varies"). Resolve the former to the next occurrence from today;
 * anything unparseable becomes null.
 */
function parseDeadline(raw, now = new Date()) {
  const match = /^(\d{1,2})-([a-z]{3})/i.exec(String(raw || "").trim());
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;

  let deadline = new Date(Date.UTC(now.getUTCFullYear(), month, day));
  if (deadline < now) {
    deadline = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day));
  }
  return deadline;
}

function buildDescription({ description, location, years, link }) {
  const parts = [];
  if (description) parts.push(description);
  if (location) parts.push(`Location: ${location}`);
  if (years) parts.push(`Eligible study levels: ${years}`);
  if (link) parts.push(`Source: ${link}`);
  return parts.join("\n\n").slice(0, 5000) || null;
}

function toRecords(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const seen = new Set();
  const records = [];

  // Skip the header row emitted by the scraper.
  for (const cells of rows.slice(1)) {
    const [name, deadline, amount, description, location, years, link] = cells;
    const title = decodeEntities(name);
    if (!title || seen.has(title)) continue;
    seen.add(title);

    records.push({
      title: title.slice(0, 255),
      provider: SOURCE,
      amount: parseAmount(amount),
      deadline: parseDeadline(deadline),
      description: buildDescription({
        description: decodeEntities(description),
        location: decodeEntities(location),
        years: decodeEntities(years),
        link: String(link || "").trim(),
      }),
    });
  }

  return records;
}

async function importScholarships(csvPath, { dryRun = false } = {}) {
  const csvText = fs.readFileSync(csvPath, "utf8");
  const records = toRecords(csvText);
  console.log(`Parsed ${records.length} scholarships from ${csvPath}`);

  if (dryRun) {
    console.log(JSON.stringify(records.slice(0, 3), null, 2));
    console.log("Dry run - no records written.");
    return { created: 0, updated: 0, total: records.length };
  }

  const prisma = getPrisma();
  let created = 0;
  let updated = 0;

  for (const record of records) {
    const existing = await prisma.scholarship.findFirst({
      where: { title: record.title, provider: record.provider },
      select: { id: true },
    });

    if (existing) {
      await prisma.scholarship.update({ where: { id: existing.id }, data: record });
      updated++;
    } else {
      await prisma.scholarship.create({ data: record });
      created++;
    }
  }

  console.log(`Import complete: ${created} created, ${updated} updated.`);
  return { created, updated, total: records.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArg = args.find((arg) => !arg.startsWith("--"));
  const csvPath = path.resolve(fileArg || path.join(__dirname, "..", "data", "scholarships.csv"));

  importScholarships(csvPath, { dryRun })
    .catch((err) => {
      console.error("Scholarship import failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (!dryRun) await getPrisma().$disconnect();
    });
}

module.exports = { importScholarships, toRecords, parseCsv, parseAmount, parseDeadline, decodeEntities };
