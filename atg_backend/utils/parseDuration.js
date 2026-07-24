// Parses simple JWT-style duration strings ("15m", "7d", "1h") into milliseconds.
const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

const parseDurationToMs = (value, fallbackMs) => {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(value || "").trim());
  if (!match) return fallbackMs;
  const [, amount, unit] = match;
  return parseInt(amount, 10) * UNIT_MS[unit.toLowerCase()];
};

module.exports = parseDurationToMs;
