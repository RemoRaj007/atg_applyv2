import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

const setting = (overrides = {}) => ({
  id: 1,
  key: "site.name",
  value: "ATG Apply",
  valueType: "text",
  group: "branding",
  label: "Site name",
  isPublic: true,
  sortOrder: 10,
  d_status: "active",
  ...overrides,
});

const block = (overrides = {}) => ({
  id: 1,
  page: "landing",
  key: "hero.title",
  value: "Land the role you deserve",
  valueType: "text",
  label: "Hero heading",
  sortOrder: 10,
  d_status: "active",
  ...overrides,
});

const template = (overrides = {}) => ({
  id: 1,
  key: "welcome",
  name: "Welcome email",
  subject: "Welcome to {{siteName}}",
  body: "Hi {{name}}, welcome.",
  variables: JSON.stringify(["name", "email", "plan", "siteName"]),
  isActive: true,
  d_status: "active",
  ...overrides,
});

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
});

describe("public content endpoints", () => {
  it("serves site settings without a token — the marketing site renders signed out", async () => {
    prisma.siteSetting.findMany.mockResolvedValue([setting()]);
    const res = await request(app).get("/api/content/public/settings");
    expect(res.status).toBe(200);
    expect(res.body.data.settings["site.name"]).toBe("ATG Apply");
  });

  it("never exposes a setting that is not flagged public", async () => {
    prisma.siteSetting.findMany.mockResolvedValue([]);
    await request(app).get("/api/content/public/settings");
    expect(prisma.siteSetting.findMany.mock.calls[0][0].where).toMatchObject({ isPublic: true });
  });

  it("coerces a value to the type its row declares", async () => {
    prisma.siteSetting.findMany.mockResolvedValue([
      setting({ key: "limits.trialApplications", value: "3", valueType: "number" }),
      setting({ key: "features.registrationOpen", value: "true", valueType: "boolean" }),
    ]);

    const res = await request(app).get("/api/content/public/settings");

    expect(res.body.data.settings["limits.trialApplications"]).toBe(3);
    expect(res.body.data.settings["features.registrationOpen"]).toBe(true);
  });

  it("serves a page's copy as a flat key/value map", async () => {
    prisma.contentBlock.findMany.mockResolvedValue([block()]);
    const res = await request(app).get("/api/content/public/pages/landing");
    expect(res.status).toBe(200);
    expect(res.body.data.content["hero.title"]).toBe("Land the role you deserve");
  });

  it("does not let a traversal sequence in the page segment reach the content query", async () => {
    // The path normalises to /api/content/etc, which lands on the admin-guarded
    // section of the router rather than on the public read.
    const res = await request(app).get("/api/content/public/pages/../../etc");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(prisma.contentBlock.findMany).not.toHaveBeenCalled();
  });

  it("rejects an unknown page rather than querying for it", async () => {
    const res = await request(app).get("/api/content/public/pages/secret-admin-page");
    expect(res.status).toBe(400);
    expect(prisma.contentBlock.findMany).not.toHaveBeenCalled();
  });
});

describe("admin-only writes", () => {
  it.each([
    ["get", "/api/content/settings"],
    ["get", "/api/content/pages"],
    ["get", "/api/content/email-templates"],
  ])("%s %s requires a token", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it("keeps settings away from operators", async () => {
    const res = await request(app).get("/api/content/settings").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });

  it("keeps content editing away from candidates", async () => {
    const res = await request(app)
      .put("/api/content/pages")
      .set(authHeader(CANDIDATE))
      .send({ blocks: [{ id: 1, value: "hacked" }] });
    expect(res.status).toBe(403);
    expect(prisma.contentBlock.update).not.toHaveBeenCalled();
  });

  it("lets an admin list every setting, public or not", async () => {
    prisma.siteSetting.findMany.mockResolvedValue([setting(), setting({ id: 2, isPublic: false })]);
    const res = await request(app).get("/api/content/settings").set(authHeader(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.data.settings).toHaveLength(2);
  });
});

describe("setting validation", () => {
  const save = (key, value, row) => {
    prisma.siteSetting.findFirst.mockResolvedValue(row);
    prisma.siteSetting.update.mockResolvedValue(row);
    return request(app).put("/api/content/settings").set(authHeader(ADMIN)).send({ settings: [{ key, value }] });
  };

  it("saves a valid value", async () => {
    const res = await save("site.name", "ATG Careers", setting());
    expect(res.status).toBe(200);
    expect(prisma.siteSetting.update.mock.calls[0][0].data.value).toBe("ATG Careers");
  });

  it("refuses a non-numeric value for a number setting", async () => {
    const res = await save("limits.trialApplications", "lots", setting({ valueType: "number", label: "Trial apps" }));
    expect(res.status).toBe(400);
    expect(prisma.siteSetting.update).not.toHaveBeenCalled();
  });

  it("refuses a javascript: URL, which would become a live link in the footer", async () => {
    const res = await save("social.linkedin", "javascript:alert(1)", setting({ valueType: "url", label: "LinkedIn" }));
    expect(res.status).toBe(400);
    expect(prisma.siteSetting.update).not.toHaveBeenCalled();
  });

  it("refuses a data: URL for the same reason", async () => {
    const res = await save("site.logoUrl", "data:text/html,<script>alert(1)</script>", setting({ valueType: "url", label: "Logo" }));
    expect(res.status).toBe(400);
  });

  it("accepts an https URL", async () => {
    const res = await save("social.linkedin", "https://linkedin.com/company/atg", setting({ valueType: "url", label: "LinkedIn" }));
    expect(res.status).toBe(200);
  });

  it("refuses a malformed email and a malformed colour", async () => {
    const bad = await save("contact.email", "not-an-email", setting({ valueType: "email", label: "Contact email" }));
    expect(bad.status).toBe(400);

    const badColor = await save("site.primaryColor", "rgb(1,2,3)", setting({ valueType: "color", label: "Primary colour" }));
    expect(badColor.status).toBe(400);
  });

  it("normalises a boolean to the stored form", async () => {
    await save("features.socialLogin", "false", setting({ valueType: "boolean", label: "Social login" }));
    expect(prisma.siteSetting.update.mock.calls[0][0].data.value).toBe("false");
  });

  it("404s an unknown setting key rather than creating one", async () => {
    prisma.siteSetting.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .put("/api/content/settings")
      .set(authHeader(ADMIN))
      .send({ settings: [{ key: "made.up", value: "x" }] });

    expect(res.status).toBe(404);
    expect(prisma.siteSetting.create).not.toHaveBeenCalled();
  });
});

describe("content blocks", () => {
  it("saves an edited block", async () => {
    prisma.contentBlock.findFirst.mockResolvedValue(block());
    prisma.contentBlock.update.mockResolvedValue(block({ value: "New heading" }));

    const res = await request(app)
      .put("/api/content/pages")
      .set(authHeader(ADMIN))
      .send({ blocks: [{ id: 1, value: "New heading" }] });

    expect(res.status).toBe(200);
    expect(prisma.contentBlock.update.mock.calls[0][0].data.value).toBe("New heading");
  });

  it("allows an empty value, so a section can be cleared", async () => {
    prisma.contentBlock.findFirst.mockResolvedValue(block());
    prisma.contentBlock.update.mockResolvedValue(block({ value: "" }));

    const res = await request(app)
      .put("/api/content/pages")
      .set(authHeader(ADMIN))
      .send({ blocks: [{ id: 1, value: "" }] });

    expect(res.status).toBe(200);
  });

  it("caps the length of a single block", async () => {
    const res = await request(app)
      .put("/api/content/pages")
      .set(authHeader(ADMIN))
      .send({ blocks: [{ id: 1, value: "x".repeat(20001) }] });

    expect(res.status).toBe(400);
  });

  it("restores a page to its shipped copy", async () => {
    prisma.contentBlock.findMany.mockResolvedValue([block()]);
    const res = await request(app).post("/api/content/pages/landing/reset").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(prisma.contentBlock.updateMany).toHaveBeenCalled();
  });

  it("refuses to reset a page that does not exist", async () => {
    const res = await request(app).post("/api/content/pages/nope/reset").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
  });
});

describe("email templates", () => {
  it("saves a subject and body that use known placeholders", async () => {
    prisma.emailTemplate.findFirst.mockResolvedValue(template());
    prisma.emailTemplate.update.mockResolvedValue(template());

    const res = await request(app)
      .put("/api/content/email-templates/1")
      .set(authHeader(ADMIN))
      .send({ subject: "Welcome, {{name}}", body: "Hi {{name}}, you are on {{plan}}." });

    expect(res.status).toBe(200);
  });

  it("refuses a placeholder the renderer does not know, which would ship verbatim", async () => {
    prisma.emailTemplate.findFirst.mockResolvedValue(template());

    const res = await request(app)
      .put("/api/content/email-templates/1")
      .set(authHeader(ADMIN))
      .send({ body: "Hi {{frist_name}}" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/frist_name/);
    expect(prisma.emailTemplate.update).not.toHaveBeenCalled();
  });

  it("strips newlines from a subject, which would otherwise inject headers", async () => {
    prisma.emailTemplate.findFirst.mockResolvedValue(template());
    prisma.emailTemplate.update.mockResolvedValue(template());

    await request(app)
      .put("/api/content/email-templates/1")
      .set(authHeader(ADMIN))
      .send({ subject: "Welcome\r\nBcc: attacker@evil.net" });

    const saved = prisma.emailTemplate.update.mock.calls[0][0].data.subject;
    expect(saved).not.toMatch(/[\r\n]/);
    expect(saved).toBe("Welcome Bcc: attacker@evil.net");
  });

  it("restores a template to its shipped copy", async () => {
    prisma.emailTemplate.findFirst.mockResolvedValue(template());
    prisma.emailTemplate.update.mockResolvedValue(template());

    const res = await request(app).post("/api/content/email-templates/1/reset").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(prisma.emailTemplate.update.mock.calls[0][0].data.subject).toBe("Welcome to {{siteName}}");
  });

  it("refuses to reset a template with no shipped default", async () => {
    prisma.emailTemplate.findFirst.mockResolvedValue(template({ key: "custom_thing" }));
    const res = await request(app).post("/api/content/email-templates/1/reset").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
  });

  it("is admin-only", async () => {
    const res = await request(app)
      .put("/api/content/email-templates/1")
      .set(authHeader(OPERATOR))
      .send({ subject: "x" });
    expect(res.status).toBe(403);
  });
});

describe("seeding defaults", () => {
  it("upserts without overwriting an existing row's value", async () => {
    const res = await request(app).post("/api/content/seed").set(authHeader(ADMIN));

    expect(res.status).toBe(200);
    const settingUpsert = prisma.siteSetting.upsert.mock.calls[0][0];
    expect(settingUpsert.update).toEqual({});
    expect(settingUpsert.create.key).toBeTruthy();
  });

  it("keeps each template's placeholder allow-list current", async () => {
    await request(app).post("/api/content/seed").set(authHeader(ADMIN));
    const templateUpsert = prisma.emailTemplate.upsert.mock.calls[0][0];
    expect(JSON.parse(templateUpsert.update.variables)).toContain("siteName");
  });

  it("is admin-only", async () => {
    const res = await request(app).post("/api/content/seed").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });
});
