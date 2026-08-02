// Minimal CSV serializer — good enough for admin/operator export dumps where
// pulling in a dependency for comma/quote escaping would be overkill.

// Excel, LibreOffice and Sheets treat a cell opening with any of these as a
// formula, so a user who names themselves `=cmd|'/c calc'!A1` gets code running
// on the machine of whoever opens the export. Quoting alone does not stop it —
// the leading apostrophe does, and spreadsheets strip it on display.
// `+`/`-` are included because they start formulas too; a leading tab or CR
// gets the same treatment because the parser skips it and reads what follows.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

const neutralizeFormula = (str) => (FORMULA_TRIGGER.test(str) ? `'${str}` : str);

const escapeCell = (value) => {
  const str = neutralizeFormula(value === null || value === undefined ? "" : String(value));
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const toCsv = (rows, columns) => {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [header, ...lines].join("\n");
};

module.exports = { toCsv };
