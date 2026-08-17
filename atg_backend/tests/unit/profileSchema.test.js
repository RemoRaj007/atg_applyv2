import { describe, it, expect, beforeEach } from "vitest";

import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
globalThis.__atgPrisma = prisma;

const { readCatalog, classifyCode, stripEntryNumber, splitSection } = await import(
  "../../scripts/seedProfileSchema.js"
);
const service = await import("../../modules/profile-schema/profile-schema.service.js");

// ─── Catalogue parsing ────────────────────────────────────────────────
describe("catalogue parsing", () => {
  const catalog = readCatalog();

  // The handoff is explicit that the profile must not be reduced to the eight
  // hard-coded steps the page used to have: all 20 chapters must survive.
  it("reads all 20 chapters", () => {
    expect(catalog.sections).toHaveLength(20);
    expect(catalog.sections[0]).toMatchObject({ code: "00", title: "Welcome & informed choice" });
    expect(catalog.sections[19]).toMatchObject({ code: "19", title: "Final review & declaration" });
  });

  it("orders chapters by their numeric code", () => {
    const codes = catalog.sections.map((section) => section.code);
    expect(codes).toEqual([...codes].sort());
  });

  it("collapses repeatable entries into a single question", () => {
    const codes = catalog.fields.map((field) => field.code);
    expect(codes).toContain("EDU1-01");
    // EDU2-01 and EDU3-01 ask the same question of a second and third degree;
    // they are entries of one field, not three separate columns.
    expect(codes).not.toContain("EDU2-01");
    expect(codes).not.toContain("EXP4-07");
    expect(codes).not.toContain("REF3-01");
  });

  it("assigns every field a unique code", () => {
    const codes = catalog.fields.map((field) => field.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("maps the form vocabulary onto input types", () => {
    const byCode = Object.fromEntries(catalog.fields.map((field) => [field.code, field]));
    expect(byCode["SYS-01"].inputType).toBe("text"); // Short answer
    expect(byCode["ELIG-01"].inputType).toBe("textarea"); // Paragraph
    expect(byCode["ID-03"].inputType).toBe("select"); // Multiple choice
    expect(byCode["CONS-01"].inputType).toBe("multiselect"); // Checkboxes
  });

  it("carries the handling rules the catalogue assigns each question", () => {
    const byCode = Object.fromEntries(catalog.fields.map((field) => [field.code, field]));
    expect(byCode["REF1-03"].sensitivity).toBe("RESTRICTED");
    expect(byCode["ID-03"].sensitivity).toBe("SENSITIVE");
    expect(byCode["ID-02"].externalAiPolicy).toBe("YES");
    expect(byCode["SYS-02"].externalAiPolicy).toBe("LIMITED");
    expect(byCode["SYS-01"].isRequired).toBe(true);
    expect(byCode["ID-01"].isRequired).toBe(false);
  });

  it("stores options and validation as JSON the API can hand to the renderer", () => {
    const byCode = Object.fromEntries(catalog.fields.map((field) => [field.code, field]));
    expect(JSON.parse(byCode["ID-03"].options)).toEqual([
      "She/her",
      "He/him",
      "They/them",
      "Use my name",
      "Prefer not to say",
    ]);
    expect(JSON.parse(byCode["SYS-01"].validation)).toEqual({ format: "email" });
    expect(byCode["ID-01"].options).toBeNull();
  });

  it("tags repeatable questions with their group", () => {
    const byCode = Object.fromEntries(catalog.fields.map((field) => [field.code, field]));
    expect(byCode["EDU1-01"].repeatableGroup).toBe("education");
    expect(byCode["EXP1-01"].repeatableGroup).toBe("employment");
    expect(byCode["PROJ1-01"].repeatableGroup).toBe("project");
    expect(byCode["REF1-01"].repeatableGroup).toBe("reference");
    expect(byCode["ID-01"].repeatableGroup).toBeNull();
    // "Additional education history" is a free-text catch-all, not an entry of
    // the repeatable group, so it must not be swept into it.
    expect(byCode["EDU-X01"].repeatableGroup).toBeNull();
  });
});

describe("classifyCode", () => {
  it("keeps the first entry and skips the repeats", () => {
    expect(classifyCode("EDU1-03")).toMatchObject({ group: "education", entry: 1, skip: false });
    expect(classifyCode("EDU2-03")).toMatchObject({ group: "education", entry: 2, skip: true });
    expect(classifyCode("EXP4-10")).toMatchObject({ group: "employment", entry: 4, skip: true });
  });

  it("leaves ordinary codes alone", () => {
    expect(classifyCode("RULE-07")).toMatchObject({ group: null, skip: false });
    expect(classifyCode("EDU-X01")).toMatchObject({ group: null, skip: false });
  });
});

describe("stripEntryNumber", () => {
  // The card is already labelled "Education 2", so repeating the number in
  // every question reads as a duplicate.
  it("removes the entry number from a repeatable label", () => {
    expect(stripEntryNumber("Education 1 — institution and country")).toBe("institution and country");
    expect(stripEntryNumber("Experience 3 — responsibilities")).toBe("responsibilities");
  });

  it("leaves a non-repeatable label untouched", () => {
    expect(stripEntryNumber("Preferred name")).toBe("Preferred name");
    expect(stripEntryNumber("Additional education history")).toBe("Additional education history");
  });
});

describe("splitSection", () => {
  it("splits the numeric code from the title", () => {
    expect(splitSection("03 — Career direction & opportunity rules")).toEqual({
      code: "03",
      title: "Career direction & opportunity rules",
    });
  });

  it("returns null for an unrecognised label", () => {
    expect(splitSection("Career direction")).toBeNull();
    expect(splitSection("")).toBeNull();
  });
});

// ─── Reading answers ──────────────────────────────────────────────────
const column = (overrides) => ({
  id: 1,
  code: "ID-02",
  label: "Professional headline",
  inputType: "text",
  isRequired: false,
  sensitivity: "CAREER",
  externalAiPolicy: "YES",
  repeatableGroup: null,
  options: null,
  validation: null,
  ...overrides,
});

describe("getValues", () => {
  beforeEach(() => resetPrismaMock());

  it("keys answers by field code so the client never holds database ids", async () => {
    prisma.profileValue.findMany.mockResolvedValue([
      { value: "Data Analyst", repeatIndex: 0, column: column({}) },
    ]);

    await expect(service.getValues(7)).resolves.toEqual({ "ID-02": "Data Analyst" });
  });

  it("returns a repeatable group as an array indexed by entry", async () => {
    prisma.profileValue.findMany.mockResolvedValue([
      { value: "Univ of Colombo", repeatIndex: 0, column: column({ id: 2, code: "EDU1-01", repeatableGroup: "education" }) },
      { value: "TU Delft", repeatIndex: 1, column: column({ id: 2, code: "EDU1-01", repeatableGroup: "education" }) },
    ]);

    await expect(service.getValues(7)).resolves.toEqual({
      "EDU1-01": ["Univ of Colombo", "TU Delft"],
    });
  });

  // Reference contact details, passport and clearance answers are the
  // candidate's to hold. Staff prepare applications without needing them.
  it("hides RESTRICTED answers from staff but not from the candidate", async () => {
    prisma.profileValue.findMany.mockResolvedValue([
      { value: "ref@example.com", repeatIndex: 0, column: column({ id: 3, code: "REF1-03", sensitivity: "RESTRICTED" }) },
      { value: "Data Analyst", repeatIndex: 0, column: column({}) },
    ]);

    await expect(service.getValues(7)).resolves.toHaveProperty("REF1-03");
    await expect(service.getValues(7, { forStaff: true })).resolves.not.toHaveProperty("REF1-03");
  });
});

// ─── Writing answers ──────────────────────────────────────────────────
describe("patchValues", () => {
  beforeEach(() => resetPrismaMock());

  const columns = [
    column({ id: 1, code: "ID-02" }),
    column({ id: 2, code: "EDU1-01", repeatableGroup: "education" }),
  ];

  it("writes only the codes it is given, leaving other answers alone", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    const result = await service.patchValues(7, [{ code: "ID-02", value: "Data Analyst" }]);

    expect(result).toEqual({ saved: 1, cleared: 0 });
    expect(prisma.profileValue.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.profileValue.deleteMany).not.toHaveBeenCalled();
  });

  // Storing "" would read back as an answered question and count toward
  // progress, so a cleared field is deleted instead.
  it("deletes an answer that is cleared rather than storing an empty string", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    const result = await service.patchValues(7, [{ code: "ID-02", value: "   " }]);

    expect(result).toEqual({ saved: 0, cleared: 1 });
    expect(prisma.profileValue.upsert).not.toHaveBeenCalled();
  });

  it("writes one row per entry of a repeatable group", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    await service.patchValues(7, [
      { code: "EDU1-01", value: "Univ of Colombo", repeatIndex: 0 },
      { code: "EDU1-01", value: "TU Delft", repeatIndex: 1 },
    ]);

    expect(prisma.profileValue.upsert).toHaveBeenCalledTimes(2);
    const indexes = prisma.profileValue.upsert.mock.calls.map(
      ([args]) => args.where.userId_columnId_repeatIndex.repeatIndex
    );
    expect(indexes).toEqual([0, 1]);
  });

  // The catalogue can be re-seeded while a candidate has the builder open. One
  // stale code should not fail the whole chapter's save.
  it("drops an unknown code instead of rejecting the save", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    const result = await service.patchValues(7, [
      { code: "GONE-99", value: "x" },
      { code: "ID-02", value: "Data Analyst" },
    ]);

    expect(result).toEqual({ saved: 1, cleared: 0 });
  });

  it("rejects an entry number on a question that is not repeatable", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    await expect(service.patchValues(7, [{ code: "ID-02", value: "x", repeatIndex: 2 }])).rejects.toThrow(
      /not a repeatable question/
    );
  });

  it("rejects an out-of-range or negative entry number", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    await expect(
      service.patchValues(7, [{ code: "EDU1-01", value: "x", repeatIndex: 500 }])
    ).rejects.toThrow(/Invalid entry number/);
    await expect(
      service.patchValues(7, [{ code: "EDU1-01", value: "x", repeatIndex: -1 }])
    ).rejects.toThrow(/Invalid entry number/);
  });

  it("rejects an answer beyond the column length", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    await expect(
      service.patchValues(7, [{ code: "ID-02", value: "x".repeat(20001) }])
    ).rejects.toThrow(/too long/);
  });

  it("rejects an empty or malformed payload", async () => {
    await expect(service.patchValues(7, [])).rejects.toThrow(/No values supplied/);
    await expect(service.patchValues(7, null)).rejects.toThrow(/No values supplied/);
  });

  it("saves every recognised code in one transaction", async () => {
    prisma.profileColumn.findMany.mockResolvedValue(columns);

    await service.patchValues(7, [
      { code: "ID-02", value: "Data Analyst" },
      { code: "EDU1-01", value: "Univ of Colombo" },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(2);
  });
});

// ─── Progress ─────────────────────────────────────────────────────────
describe("getProgress", () => {
  beforeEach(() => resetPrismaMock());

  it("counts answered questions and completes a chapter on its required ones", async () => {
    prisma.profileSection.findMany.mockResolvedValue([
      {
        id: 1,
        code: "00",
        title: "Welcome & informed choice",
        sortOrder: 0,
        columns: [
          column({ id: 1, code: "SYS-01", isRequired: true }),
          column({ id: 2, code: "SYS-02", isRequired: true }),
          column({ id: 3, code: "ID-01", isRequired: false }),
        ],
      },
    ]);
    prisma.profileValue.findMany.mockResolvedValue([
      { value: "a@b.com", repeatIndex: 0, column: column({ id: 1, code: "SYS-01", isRequired: true }) },
      { value: "Ada", repeatIndex: 0, column: column({ id: 3, code: "ID-01" }) },
    ]);

    const [chapter] = await service.getProgress(7);

    expect(chapter).toMatchObject({
      code: "00",
      total: 3,
      answered: 2,
      requiredTotal: 2,
      requiredAnswered: 1,
      complete: false,
    });
  });
});
