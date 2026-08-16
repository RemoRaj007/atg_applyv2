import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";

// The service and the seed script are CommonJS and reach Prisma through
// `require`, which vi.mock does not intercept. config/db.js reuses
// `globalThis.__atgPrisma` when it is already set — its serverless warm-start
// cache — so installing the mock there before the first require hands both
// modules the mock client. Same mechanism as tests/helpers/app.js.
globalThis.__atgPrisma = prisma;

const service = await import("../../modules/profile-schema/profileSchema.service.js");
const { readCatalog, classifyCode, stripEntryNumber } = await import("../../scripts/seedProfileSchema.js");

// ─── The catalogue ────────────────────────────────────────────────────────────
//
// The handoff is explicit that the 20 chapters and every stable field code must
// survive into the schema, and that the catalogue must not be reduced back to
// the eight generic steps the old profile page had. These lock that in.

describe("profile catalogue", () => {
  const catalog = readCatalog();

  it("carries all 20 chapters, in order", () => {
    expect(catalog.sections).toHaveLength(20);
    expect(catalog.sections.map((s) => s.code)).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i).padStart(2, "0"))
    );
  });

  it("requires only the agreed operating minimum", () => {
    // Career content stays optional so a candidate can start small; requiring
    // more would make an empty profile unsubmittable and defeat the point.
    const required = catalog.fields.filter((f) => f.isRequired).map((f) => f.code).sort();
    expect(required).toEqual(["CONS-01", "CONS-02", "FINAL-02", "FINAL-03", "SYS-01", "SYS-02", "SYS-03"]);
  });

  it("never sends restricted or sensitive data to an external AI", () => {
    const leaky = catalog.fields.filter(
      (f) => ["RESTRICTED", "SENSITIVE"].includes(f.sensitivity) && f.externalAiPolicy === "YES"
    );
    expect(leaky).toEqual([]);
  });

  it("collapses repeated entries into one repeatable field rather than duplicate columns", () => {
    // EDU1-01, EDU2-01 and EDU3-01 are the same question asked three times.
    // Seeding three columns would make "add a fourth degree" a schema change.
    expect(classifyCode("EDU1-01").skip).toBe(false);
    expect(classifyCode("EDU2-01").skip).toBe(true);
    expect(classifyCode("EDU3-01").skip).toBe(true);
    expect(classifyCode("EDU1-01").group).toBe("education");
    expect(classifyCode("SYS-01").group).toBeNull();

    const codes = catalog.fields.map((f) => f.code);
    expect(codes).toContain("EDU1-01");
    expect(codes).not.toContain("EDU2-01");
  });

  it("drops the entry number from a repeatable field's label", () => {
    // The card is already headed "Education 2"; repeating it in every label reads badly.
    expect(stripEntryNumber("Education 1 — institution and country")).toBe("institution and country");
    expect(stripEntryNumber("Primary email address")).toBe("Primary email address");
  });

  it("keeps every field code unique", () => {
    const codes = catalog.fields.map((f) => f.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// ─── Completion ───────────────────────────────────────────────────────────────

describe("chapter completion", () => {
  const chapter = (fields) => [{ code: "01", title: "Test", fields }];
  const values = (pairs) => new Map(pairs.map(([id, v]) => [id, [{ value: v }]]));

  it("reports a chapter with nothing in it as not started", () => {
    const result = service.summarise(chapter([{ id: 1, code: "A-01", required: false }]), new Map());
    expect(result[0].status).toBe("not_started");
  });

  it("reports a partly filled optional chapter as in progress", () => {
    const fields = [
      { id: 1, code: "A-01", required: false },
      { id: 2, code: "A-02", required: false },
    ];
    const result = service.summarise(chapter(fields), values([[1, "something"]]));
    expect(result[0].status).toBe("in_progress");
    expect(result[0].filled).toBe(1);
  });

  it("reports a fully filled chapter as complete", () => {
    const fields = [{ id: 1, code: "A-01", required: false }];
    const result = service.summarise(chapter(fields), values([[1, "something"]]));
    expect(result[0].status).toBe("complete");
  });

  it("flags a started chapter that is still missing a required field", () => {
    const fields = [
      { id: 1, code: "A-01", required: true },
      { id: 2, code: "A-02", required: false },
    ];
    const result = service.summarise(chapter(fields), values([[2, "optional answer"]]));
    expect(result[0].status).toBe("needs_review");
    expect(result[0].requiredMissing).toEqual(["A-01"]);
  });

  it("treats whitespace as empty", () => {
    // "   " in a text box is not an answer, and counting it as one would report
    // a chapter complete that a human would read as blank.
    const fields = [{ id: 1, code: "A-01", required: true }];
    const result = service.summarise(chapter(fields), values([[1, "   "]]));
    expect(result[0].filled).toBe(0);
    expect(result[0].requiredMissing).toEqual(["A-01"]);
  });
});

// ─── AI payload gating ────────────────────────────────────────────────────────

describe("selectAiEligible", () => {
  const chapters = [
    {
      fields: [
        { code: "OK-01", label: "career", externalAiPolicy: "YES", sensitivity: "CAREER", values: [{ value: "a" }] },
        { code: "LIM-01", label: "limited", externalAiPolicy: "LIMITED", sensitivity: "PRIVATE", values: [{ value: "b" }] },
        { code: "NO-01", label: "never", externalAiPolicy: "NO", sensitivity: "PRIVATE", values: [{ value: "c" }] },
        { code: "RES-01", label: "restricted", externalAiPolicy: "YES", sensitivity: "RESTRICTED", values: [{ value: "d" }] },
      ],
    },
  ];

  it("includes only YES fields by default", () => {
    expect(service.selectAiEligible(chapters).map((f) => f.code)).toEqual(["OK-01"]);
  });

  it("includes LIMITED fields only when the caller asks for them", () => {
    const codes = service.selectAiEligible(chapters, { includeLimited: true }).map((f) => f.code);
    expect(codes).toEqual(["OK-01", "LIM-01"]);
  });

  it("never includes a NO field, whatever the options", () => {
    for (const opts of [{}, { includeLimited: true }]) {
      expect(service.selectAiEligible(chapters, opts).map((f) => f.code)).not.toContain("NO-01");
    }
  });

  it("never includes RESTRICTED data even when its AI policy says YES", () => {
    // Belt and braces: the catalogue should never mark a RESTRICTED field YES,
    // but an administrator-created field could, and the payload builder is the
    // wrong place to find that out.
    const codes = service.selectAiEligible(chapters, { includeLimited: true }).map((f) => f.code);
    expect(codes).not.toContain("RES-01");
  });
});

// ─── Writes ───────────────────────────────────────────────────────────────────

describe("patchFields", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("rejects a field code that is not in the schema", async () => {
    prisma.profileColumn.findMany.mockResolvedValue([]);
    await expect(
      service.patchFields({ userId: 1, actorId: 1, updates: [{ code: "NOPE-99", value: "x" }] })
    ).rejects.toThrow(/Unknown profile field code/);
    // Nothing is written when any code in the batch is unrecognised.
    expect(prisma.profileValue.upsert).not.toHaveBeenCalled();
  });

  it("refuses a repeatIndex on a field that is not repeatable", async () => {
    prisma.profileColumn.findMany.mockResolvedValue([
      { id: 5, code: "SYS-01", repeatableGroup: null },
    ]);
    await expect(
      service.patchFields({ userId: 1, actorId: 1, updates: [{ code: "SYS-01", repeatIndex: 2, value: "x" }] })
    ).rejects.toThrow(/not repeatable/);
  });

  it("writes one repeatable entry without disturbing the others", async () => {
    prisma.profileColumn.findMany.mockResolvedValue([
      { id: 9, code: "EDU1-01", repeatableGroup: "education" },
    ]);
    prisma.profileValue.upsert.mockResolvedValue({ updatedAt: new Date() });

    await service.patchFields({
      userId: 7,
      actorId: 7,
      updates: [{ code: "EDU1-01", repeatIndex: 2, value: "Trinity College" }],
    });

    expect(prisma.profileValue.upsert).toHaveBeenCalledOnce();
    const args = prisma.profileValue.upsert.mock.calls[0][0];
    expect(args.where.userId_columnId_repeatIndex).toEqual({ userId: 7, columnId: 9, repeatIndex: 2 });
    expect(args.create.value).toBe("Trinity College");
  });

  it("rejects an empty batch rather than reporting a no-op save as success", async () => {
    await expect(service.patchFields({ userId: 1, actorId: 1, updates: [] })).rejects.toThrow(
      /No field updates/
    );
  });
});
