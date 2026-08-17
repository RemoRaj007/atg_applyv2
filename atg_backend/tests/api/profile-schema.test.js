import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE, CANDIDATE_2, VISITOR } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

// A minimal two-chapter schema: one ordinary career field and one RESTRICTED
// one, which is what the redaction rules turn on.
const section = () => ({
  id: 1,
  code: "16",
  title: "References & verification",
  description: null,
  sortOrder: 16,
  fields: [
    {
      id: 10,
      code: "REF1-01",
      label: "name and pronouns/title",
      helpText: null,
      inputType: "text",
      isRequired: false,
      sensitivity: "PRIVATE",
      externalAiPolicy: "NO",
      defaultApplicationUse: null,
      purpose: null,
      repeatableGroup: "reference",
      sortOrder: 0,
      options: null,
      validation: null,
    },
    {
      id: 11,
      code: "REF1-03",
      label: "email and phone with country code",
      helpText: null,
      inputType: "textarea",
      isRequired: false,
      sensitivity: "RESTRICTED",
      externalAiPolicy: "NO",
      defaultApplicationUse: null,
      purpose: null,
      repeatableGroup: "reference",
      sortOrder: 1,
      options: null,
      validation: null,
    },
  ],
});

const values = () => [
  { columnId: 10, repeatIndex: 0, value: "Dr Ada Lovelace", source: "candidate", verified: false, verifiedAt: null, updatedAt: new Date() },
  { columnId: 11, repeatIndex: 0, value: "ada@example.com · +353 1 234 5678", source: "candidate", verified: false, verifiedAt: null, updatedAt: new Date() },
];

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
  prisma.profileSection.findMany.mockResolvedValue([section()]);
  prisma.profileValue.findMany.mockResolvedValue(values());
});

describe("profile schema access", () => {
  it.each([
    ["get", "/api/profile/schema"],
    ["get", "/api/profile/me"],
    ["patch", "/api/profile/me/fields"],
    ["post", "/api/profile/me/review"],
    ["get", "/api/profile/users/4"],
  ])("rejects unauthenticated %s %s", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it("lets any signed-in user read the question catalogue", async () => {
    // The schema is the questions, not anyone's answers.
    const res = await request(app).get("/api/profile/schema").set(authHeader(VISITOR));
    expect(res.status).toBe(200);
    expect(res.body.data.chapters[0].code).toBe("16");
  });

  it("does not let a candidate open another candidate's profile", async () => {
    const res = await request(app).get(`/api/profile/users/${CANDIDATE.id}`).set(authHeader(CANDIDATE_2));
    expect(res.status).toBe(403);
  });
});

describe("restricted values", () => {
  it("returns a candidate their own restricted values", async () => {
    const res = await request(app).get("/api/profile/me").set(authHeader(CANDIDATE));
    expect(res.status).toBe(200);
    const restricted = res.body.data.chapters[0].fields.find((f) => f.code === "REF1-03");
    expect(restricted.gated).toBe(false);
    expect(restricted.values[0].value).toContain("ada@example.com");
  });

  it("withholds them from an operator viewing someone else's profile", async () => {
    const res = await request(app).get(`/api/profile/users/${CANDIDATE.id}`).set(authHeader(OPERATOR));
    expect(res.status).toBe(200);
    const restricted = res.body.data.chapters[0].fields.find((f) => f.code === "REF1-03");
    // Not merely flagged: the value is absent from the payload, so a client
    // that ignores `gated` still cannot render a referee's phone number.
    expect(restricted.gated).toBe(true);
    expect(restricted.values).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain("ada@example.com");

    // The non-restricted field on the same chapter is still readable — the
    // operator has to be able to do their job.
    const ordinary = res.body.data.chapters[0].fields.find((f) => f.code === "REF1-01");
    expect(ordinary.values[0].value).toBe("Dr Ada Lovelace");
  });

  it("lets an admin see them", async () => {
    const res = await request(app).get(`/api/profile/users/${CANDIDATE.id}`).set(authHeader(ADMIN));
    expect(res.status).toBe(200);
    const restricted = res.body.data.chapters[0].fields.find((f) => f.code === "REF1-03");
    expect(restricted.gated).toBe(false);
  });
});

describe("saving fields", () => {
  it("saves one field at a time so autosave does not resend the profile", async () => {
    prisma.profileColumn.findMany.mockResolvedValue([{ id: 10, code: "REF1-01", repeatableGroup: "reference" }]);
    prisma.profileValue.upsert.mockResolvedValue({ updatedAt: new Date() });

    const res = await request(app)
      .patch("/api/profile/me/fields")
      .set(authHeader(CANDIDATE))
      .send({ updates: [{ code: "REF1-01", repeatIndex: 1, value: "Grace Hopper" }] });

    expect(res.status).toBe(200);
    const args = prisma.profileValue.upsert.mock.calls[0][0];
    expect(args.where.userId_columnId_repeatIndex.userId).toBe(CANDIDATE.id);
    expect(args.where.userId_columnId_repeatIndex.repeatIndex).toBe(1);
  });

  it("writes against the caller's own id, not one supplied in the body", async () => {
    prisma.profileColumn.findMany.mockResolvedValue([{ id: 10, code: "REF1-01", repeatableGroup: "reference" }]);
    prisma.profileValue.upsert.mockResolvedValue({ updatedAt: new Date() });

    await request(app)
      .patch("/api/profile/me/fields")
      .set(authHeader(CANDIDATE))
      .send({ userId: CANDIDATE_2.id, updates: [{ code: "REF1-01", value: "x" }] });

    const args = prisma.profileValue.upsert.mock.calls[0][0];
    expect(args.where.userId_columnId_repeatIndex.userId).toBe(CANDIDATE.id);
  });

  it("rejects a malformed field code before it reaches the database", async () => {
    const res = await request(app)
      .patch("/api/profile/me/fields")
      .set(authHeader(CANDIDATE))
      .send({ updates: [{ code: "'; DROP TABLE users; --", value: "x" }] });

    expect(res.status).toBe(400);
    expect(prisma.profileValue.upsert).not.toHaveBeenCalled();
  });

  it("records the write as candidate-sourced even if the body claims otherwise", async () => {
    // Otherwise a candidate could mark their own answer as operator-verified.
    prisma.profileColumn.findMany.mockResolvedValue([{ id: 10, code: "REF1-01", repeatableGroup: "reference" }]);
    prisma.profileValue.upsert.mockResolvedValue({ updatedAt: new Date() });

    await request(app)
      .patch("/api/profile/me/fields")
      .set(authHeader(CANDIDATE))
      .send({ updates: [{ code: "REF1-01", value: "x", source: "operator_request" }] });

    expect(prisma.profileValue.upsert.mock.calls[0][0].create.source).toBe("candidate");
  });
});

describe("submitting for review", () => {
  it("blocks submission while a required field is empty", async () => {
    const withRequired = section();
    withRequired.fields[0].isRequired = true;
    prisma.profileSection.findMany.mockResolvedValue([withRequired]);
    prisma.profileValue.findMany.mockResolvedValue([]);

    const res = await request(app).post("/api/profile/me/review").set(authHeader(CANDIDATE)).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("REF1-01");
  });

  it("accepts a profile whose optional chapters are still empty", async () => {
    // Career content is optional by design: a candidate must be able to submit
    // early and keep adding.
    prisma.profileValue.findMany.mockResolvedValue([]);
    const res = await request(app).post("/api/profile/me/review").set(authHeader(CANDIDATE)).send({});
    expect(res.status).toBe(200);
  });
});

describe("operator boundaries", () => {
  it("gives an operator no write path to a candidate's values", async () => {
    // The only staff routes are read, correction-request and note. An operator
    // must never be able to silently rewrite a candidate's history, so there is
    // no PATCH under /users/:userId at all — it 404s rather than 403s.
    const res = await request(app)
      .patch(`/api/profile/users/${CANDIDATE.id}/fields`)
      .set(authHeader(OPERATOR))
      .send({ updates: [{ code: "REF1-01", value: "rewritten" }] });
    expect([403, 404]).toContain(res.status);
    expect(prisma.profileValue.upsert).not.toHaveBeenCalled();
  });

  it("records a correction request against the candidate, authored by the operator", async () => {
    prisma.profileColumn.findFirst.mockResolvedValue({ id: 10, code: "REF1-01", label: "name" });
    prisma.changeRequest.create.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post(`/api/profile/users/${CANDIDATE.id}/corrections`)
      .set(authHeader(OPERATOR))
      .send({ code: "REF1-01", reason: "The employer name looks misspelled." });

    expect(res.status).toBe(201);
    const data = prisma.changeRequest.create.mock.calls[0][0].data;
    expect(data.type).toBe("profile_correction");
    expect(data.targetId).toBe(CANDIDATE.id);
    expect(data.createdById).toBe(OPERATOR.id);
  });

  it("keeps operator notes out of the candidate's own profile response", async () => {
    prisma.profileNote.create.mockResolvedValue({ id: 1 });
    await request(app)
      .post(`/api/profile/users/${CANDIDATE.id}/notes`)
      .set(authHeader(OPERATOR))
      .send({ body: "Chase the 2019 gap before submitting." });

    const res = await request(app).get("/api/profile/me").set(authHeader(CANDIDATE));
    expect(JSON.stringify(res.body)).not.toContain("Chase the 2019 gap");
  });

  it("does not let a candidate read notes or corrections written about them", async () => {
    for (const path of [`/api/profile/users/${CANDIDATE.id}/notes`, `/api/profile/users/${CANDIDATE.id}/corrections`]) {
      const res = await request(app).get(path).set(authHeader(CANDIDATE));
      expect(res.status).toBe(403);
    }
  });
});

// The schema-driven endpoint is not the only reader of ProfileValue. The older
// /api/profile-values route reads the same table, and once candidates began
// entering restricted answers through the builder it handed them to any
// operator who opened the candidate directory — the newer endpoint's gating
// did nothing for it. Found by opening the operator UI and seeing a referee's
// phone number on screen.
describe("legacy profile-values endpoint", () => {
  const row = (columnId, value, sensitivity) => ({
    id: columnId,
    userId: CANDIDATE.id,
    columnId,
    repeatIndex: 0,
    value,
    d_status: "active",
    column: { id: columnId, code: `X-0${columnId}`, sensitivity, label: "f" },
  });

  beforeEach(() => {
    prisma.profileValue.findMany.mockResolvedValue([
      row(1, "Ordinary career fact", "CAREER"),
      row(2, "secret-referee@example.com +353 1 999", "RESTRICTED"),
    ]);
  });

  it("withholds restricted values from an operator", async () => {
    const res = await request(app)
      .get(`/api/profile-values/${CANDIDATE.id}`)
      .set(authHeader(OPERATOR));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("secret-referee@example.com");
    expect(JSON.stringify(res.body)).toContain("Ordinary career fact");
  });

  it("still returns them to the candidate who entered them", async () => {
    const res = await request(app)
      .get(`/api/profile-values/${CANDIDATE.id}`)
      .set(authHeader(CANDIDATE));
    expect(JSON.stringify(res.body)).toContain("secret-referee@example.com");
  });

  it("returns them to an admin", async () => {
    const res = await request(app).get(`/api/profile-values/${CANDIDATE.id}`).set(authHeader(ADMIN));
    expect(JSON.stringify(res.body)).toContain("secret-referee@example.com");
  });
});
