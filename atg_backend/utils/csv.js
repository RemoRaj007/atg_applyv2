// Minimal CSV serializer — good enough for admin/operator export dumps where
// pulling in a dependency for comma/quote escaping would be overkill.
const escapeCell = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const toCsv = (rows, columns) => {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [header, ...lines].join("\n");
};

module.exports = { toCsv };
