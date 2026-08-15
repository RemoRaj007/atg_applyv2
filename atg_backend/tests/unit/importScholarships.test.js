import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  parseCsv,
  parseAmount,
  parseDeadline,
  decodeEntities,
  toRecords,
} from "../../scripts/importScholarships.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(here, "..", "..", "data", "scholarships.csv");

describe("parseCsv", () => {
  it("handles quoted fields with commas, newlines and escaped quotes", () => {
    const rows = parseCsv('a,b\n"one, two","say ""hi""\nagain"\n');

    expect(rows).toEqual([
      ["a", "b"],
      ["one, two", 'say "hi"\nagain'],
    ]);
  });
});

describe("parseAmount", () => {
  it("strips thousands separators", () => {
    expect(parseAmount("25,000")).toBe(25000);
  });

  it("returns null for the scraper's empty-amount markers", () => {
    expect(parseAmount("v")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("parseDeadline", () => {
  const now = new Date(Date.UTC(2026, 5, 1)); // 1 Jun 2026

  it("resolves a day-month deadline later this year", () => {
    expect(parseDeadline("31-Oct", now).toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });

  it("rolls a past day-month deadline into next year", () => {
    expect(parseDeadline("28-Feb", now).toISOString()).toBe("2027-02-28T00:00:00.000Z");
  });

  it("returns null for free-text deadlines", () => {
    expect(parseDeadline("Rolling", now)).toBeNull();
    expect(parseDeadline("", now)).toBeNull();
  });
});

describe("decodeEntities", () => {
  it("decodes numeric and named HTML entities left by the scraper", () => {
    expect(decodeEntities("SIF&#039;s Education &amp; Leadership")).toBe("SIF's Education & Leadership");
  });
});

describe("toRecords", () => {
  it("maps the committed scraper export onto Scholarship fields", () => {
    const records = toRecords(fs.readFileSync(csvPath, "utf8"));

    expect(records).toHaveLength(100);
    expect(records.every((r) => r.title && r.provider)).toBe(true);
    expect(records.some((r) => r.deadline === null)).toBe(true);
    expect(records.some((r) => /&#|&amp;/.test(r.title + r.description))).toBe(false);
    expect(records[0]).toMatchObject({
      title: "Order Sons of Italy in America National Leadership Grant",
      provider: "collegescholarships.org",
      amount: 25000,
    });
  });

  it("drops duplicate titles", () => {
    const titles = toRecords(fs.readFileSync(csvPath, "utf8")).map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
