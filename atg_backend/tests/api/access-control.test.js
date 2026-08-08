import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import argon2 from "argon2";

import { loadApp, authHeader, ADMIN, OPERATOR, OPERATOR_2, CANDIDATE, CANDIDATE_2, COMPANY } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

const user = (overrides = {}) => ({
  id: 4,
  email: "candidate@example.com",
  name: "Cand Idate",
  role: "candidate",
  companyId: null,
  pkg: "Trial",
  appsUsed: 0,
  appsTotal: 10,
  capacity: 5,
  d_status: "active",
  createdAt: new Date(),
  ...overrides,
});

const application = (overrides = {}) => ({
  id: 100,
  userId: CANDIDATE.id,
  staffId: null,
  jobId: 50,
  scholarshipId: null,
  status: "requested",
  d_status: "active",
  createdAt: new Date(),
  user: { id: CANDIDATE.id, name: "Cand Idate", email: "candidate@example.com" },
  staff: null,
  job: { id: 50, title: "Engineer", company: "Acme", companyId: 11 },
  scholarship: null,
  ...overrides,
});

beforeEach(() => {
  resetPrismaMock();
  // The limiter's window is process-wide, so an earlier case would otherwise
  // spend the budget the next one needs.
  rateLimit.reset();
});

describe("unauthenticated access", () => {
  it.each([
    ["get", "/api/users"],
    ["get", "/api/applications"],
    ["get", "/api/payments"],
    ["get", "/api/jobs"],
    ["get", "/api/notifications"],
    ["get", "/api/companies"],
    ["get", "/api/team/capacity"],
    ["get", "/api/user-profile/4"],
    ["get", "/api/profile-values/4"],
  ])("%s %s requires a token", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it("leaves the public contact form open", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({ name: "Ada", email: "ada@example.com", subject: "Hello", message: "A message long enough." });
    expect(res.status).toBe(200);
  });

  it("serves the package catalogue without a token, as the pricing page needs", async () => {
    prisma.paymentOption.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/payment-options");
    expect(res.status).toBe(200);
  });
});

describe("role gates", () => {
  it("keeps the user list away from candidates", async () => {
    const res = await request(app).get("/api/users").set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
  });

  it("keeps the application export away from candidates", async () => {
    const res = await request(app).get("/api/applications/export").set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
  });

  it("keeps company CRUD away from operators", async () => {
    const res = await request(app).post("/api/companies").set(authHeader(OPERATOR)).send({ name: "X" });
    expect(res.status).toBe(403);
  });

  it("keeps scholarship deletion away from operators", async () => {
    const res = await request(app).delete("/api/scholarships/1").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });

  it("keeps application deletion away from operators", async () => {
    const res = await request(app).delete("/api/applications/1").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });
});

describe("privilege escalation", () => {
  it("does not let an operator promote a user to admin", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: 4 }));
    prisma.user.update.mockResolvedValue(user({ id: 4, role: "admin" }));

    const res = await request(app).put("/api/users/4").set(authHeader(OPERATOR)).send({ role: "admin" });

    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not let an operator create an admin account", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(user({ role: "admin" }));

    const res = await request(app)
      .post("/api/users")
      .set(authHeader(OPERATOR))
      .send({ email: "new@example.com", name: "New Admin", password: "Password123!", role: "admin" });

    expect(res.status).toBe(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("does not let an operator reset an admin's password", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: 1, role: "admin" }));
    prisma.user.update.mockResolvedValue(user({ id: 1, role: "admin" }));

    const res = await request(app).put("/api/users/1").set(authHeader(OPERATOR)).send({ password: "Hijacked123!" });

    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not let an operator delete an admin", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: 1, role: "admin" }));

    const res = await request(app).delete("/api/users/1").set(authHeader(OPERATOR));

    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does let an admin change a role", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: 4 }));
    prisma.user.update.mockResolvedValue(user({ id: 4, role: "operator" }));

    const res = await request(app).put("/api/users/4").set(authHeader(ADMIN)).send({ role: "operator" });

    expect(res.status).toBe(200);
    expect(prisma.user.update.mock.calls[0][0].data.role).toBe("operator");
  });

  it("does not let a candidate change their own role or quota", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: CANDIDATE.id }));
    prisma.user.update.mockResolvedValue(user({ id: CANDIDATE.id }));

    const res = await request(app)
      .put(`/api/users/${CANDIDATE.id}`)
      .set(authHeader(CANDIDATE))
      .send({ name: "Renamed", role: "admin", appsTotal: 9999 });

    expect(res.status).toBe(200);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.role).toBeUndefined();
    expect(data.appsTotal).toBeUndefined();
    expect(data.name).toBe("Renamed");
  });

  it("does not let a candidate edit another user's profile", async () => {
    prisma.user.findFirst.mockResolvedValue(user({ id: CANDIDATE_2.id }));

    const res = await request(app).put(`/api/users/${CANDIDATE_2.id}`).set(authHeader(CANDIDATE)).send({ name: "Hacked" });

    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("application ownership (IDOR)", () => {
  it("blocks a candidate reading someone else's application", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ userId: CANDIDATE_2.id }));

    const res = await request(app).get("/api/applications/100").set(authHeader(CANDIDATE));

    expect(res.status).toBe(403);
  });

  it("scopes a candidate's list to their own records", async () => {
    prisma.candidateApplication.findMany.mockResolvedValue([]);
    await request(app).get("/api/applications").set(authHeader(CANDIDATE));
    expect(prisma.candidateApplication.findMany.mock.calls[0][0].where).toMatchObject({ userId: CANDIDATE.id });
  });

  it("blocks a company reading an application that is not for one of its jobs", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(
      application({ job: { id: 50, title: "Engineer", company: "Other", companyId: 999 } })
    );

    const res = await request(app).get("/api/applications/100").set(authHeader(COMPANY));

    expect(res.status).toBe(403);
  });

  it("blocks a company reading a scholarship application, which has no job to scope by", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(
      application({ jobId: null, job: null, scholarshipId: 9, scholarship: { id: 9, title: "Grant" } })
    );

    const res = await request(app).get("/api/applications/100").set(authHeader(COMPANY));

    expect(res.status).toBe(403);
  });

  it("hides internal comments from the candidate", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application());
    await request(app).get("/api/applications/100").set(authHeader(CANDIDATE));

    const include = prisma.candidateApplication.findFirst.mock.calls[0][0].include;
    expect(include.comments.where).toMatchObject({ type: "public" });
  });

  it("blocks an operator from editing an application booked by another operator", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ staffId: OPERATOR_2.id }));

    const res = await request(app).patch("/api/applications/100").set(authHeader(OPERATOR)).field("status", "completed");

    expect(res.status).toBe(403);
    expect(prisma.candidateApplication.update).not.toHaveBeenCalled();
  });

  it("blocks a candidate confirming an application that is not theirs", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ userId: CANDIDATE_2.id, status: "fit_reviewed" }));

    const res = await request(app).patch("/api/applications/100/confirm-apply").set(authHeader(CANDIDATE));

    expect(res.status).toBe(403);
    expect(prisma.candidateApplication.update).not.toHaveBeenCalled();
  });

  it("blocks feedback on an application that is not theirs", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ userId: CANDIDATE_2.id, status: "completed" }));

    const res = await request(app)
      .post("/api/applications/100/feedback")
      .set(authHeader(CANDIDATE))
      .send({ rating: 5, text: "Great" });

    expect(res.status).toBe(403);
  });

  it("scopes the operator CSV export to that operator's own applications", async () => {
    prisma.candidateApplication.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/applications/export").set(authHeader(OPERATOR));

    expect(res.status).toBe(200);
    expect(prisma.candidateApplication.findMany.mock.calls[0][0].where).toMatchObject({ staffId: OPERATOR.id });
  });

  it("lets an admin export everything", async () => {
    prisma.candidateApplication.findMany.mockResolvedValue([]);

    await request(app).get("/api/applications/export").set(authHeader(ADMIN));

    expect(prisma.candidateApplication.findMany.mock.calls[0][0].where.staffId).toBeUndefined();
  });
});

describe("candidate application quota", () => {
  it("refuses to create once the quota is spent", async () => {
    prisma.user.findUnique.mockResolvedValue(user({ appsUsed: 10, appsTotal: 10 }));

    const res = await request(app).post("/api/applications").set(authHeader(CANDIDATE)).send({ jobId: 50 });

    expect(res.status).toBe(400);
    expect(prisma.candidateApplication.create).not.toHaveBeenCalled();
  });

  it("refuses to confirm once the quota is spent", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "fit_reviewed" }));
    prisma.user.findUnique.mockResolvedValue(user({ appsUsed: 10, appsTotal: 10 }));

    const res = await request(app).patch("/api/applications/100/confirm-apply").set(authHeader(CANDIDATE));

    expect(res.status).toBe(400);
    expect(prisma.candidateApplication.update).not.toHaveBeenCalled();
  });

  it("forces a candidate's own id onto the record even when another is posted", async () => {
    prisma.user.findUnique.mockResolvedValue(user());
    // The quota slot is claimed with a conditional updateMany; count 1 means this
    // request won it.
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.candidateApplication.create.mockResolvedValue(application());
    prisma.candidateApplication.findFirst.mockResolvedValue(application());

    await request(app)
      .post("/api/applications")
      .set(authHeader(CANDIDATE))
      .send({ jobId: 50, userId: CANDIDATE_2.id, fitScore: 100 });

    expect(prisma.candidateApplication.create.mock.calls[0][0].data.userId).toBe(CANDIDATE.id);
  });
});

describe("payments", () => {
  it("scopes a candidate's list to their own payments", async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    await request(app).get("/api/payments").set(authHeader(CANDIDATE));
    expect(prisma.payment.findMany.mock.calls[0][0].where).toMatchObject({ userId: CANDIDATE.id });
  });

  it("blocks a candidate reading another user's payment", async () => {
    prisma.payment.findFirst.mockResolvedValue({ id: 1, userId: CANDIDATE_2.id, d_status: "active" });
    const res = await request(app).get("/api/payments/1").set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
  });

  it("ignores a self-declared paid/status on create", async () => {
    prisma.payment.create.mockResolvedValue({ id: 1, userId: CANDIDATE.id, amount: 10, status: "pending", paid: false });

    await request(app)
      .post("/api/payments")
      .set(authHeader(CANDIDATE))
      .send({ amount: 10, paid: true, status: "completed" });

    const data = prisma.payment.create.mock.calls[0][0].data;
    expect(data.paid).toBe(false);
    expect(data.status).toBe("pending");
  });

  it("ignores a userId posted by a non-admin", async () => {
    prisma.payment.create.mockResolvedValue({ id: 1, userId: CANDIDATE.id, amount: 10 });

    await request(app).post("/api/payments").set(authHeader(CANDIDATE)).send({ amount: 10, userId: ADMIN.id });

    expect(prisma.payment.create.mock.calls[0][0].data.userId).toBe(CANDIDATE.id);
  });

  it("keeps payment approval away from candidates", async () => {
    const res = await request(app).patch("/api/payments/1").set(authHeader(CANDIDATE)).send({ paid: true });
    expect(res.status).toBe(403);
  });
});

describe("profile data (PII)", () => {
  it("blocks a candidate reading another user's profile values", async () => {
    const res = await request(app).get(`/api/profile-values/${CANDIDATE_2.id}`).set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
    expect(prisma.profileValue.findMany).not.toHaveBeenCalled();
  });

  it("blocks a candidate reading another user's full profile", async () => {
    const res = await request(app).get(`/api/user-profile/${CANDIDATE_2.id}`).set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("blocks a company reading a candidate's full profile", async () => {
    const res = await request(app).get(`/api/user-profile/${CANDIDATE.id}`).set(authHeader(COMPANY));
    expect(res.status).toBe(403);
  });

  it("never returns the password hash on a profile read", async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({ id: CANDIDATE.id, password: await argon2.hash("Password123!"), resetPasswordToken: "tok" })
    );

    const res = await request(app).get(`/api/user-profile/${CANDIDATE.id}`).set(authHeader(CANDIDATE));

    expect(res.status).toBe(200);
    expect(res.body.password).toBeUndefined();
    expect(res.body.resetPasswordToken).toBeUndefined();
  });

  it("rejects a non-numeric user id instead of failing at the database", async () => {
    const res = await request(app).get("/api/user-profile/not-a-number").set(authHeader(ADMIN));
    expect(res.status).toBe(400);
  });

  it("blocks editing a profile record that belongs to someone else", async () => {
    prisma.userPhone.findUnique.mockResolvedValue({ id: 9, userId: CANDIDATE_2.id });

    const res = await request(app)
      .put("/api/user-profile/phones/9")
      .set(authHeader(CANDIDATE))
      .send({ phoneNumber: "+94771234567" });

    expect(res.status).toBe(404);
    expect(prisma.userPhone.update).not.toHaveBeenCalled();
  });

  it("blocks deleting a document that belongs to someone else", async () => {
    prisma.userDocument.findUnique.mockResolvedValue({ id: 9, userId: CANDIDATE_2.id });

    const res = await request(app).delete("/api/user-profile/document/9").set(authHeader(CANDIDATE));

    expect(res.status).toBe(404);
    expect(prisma.userDocument.delete).not.toHaveBeenCalled();
  });

  it("rejects an unknown profile entity name", async () => {
    const res = await request(app).post("/api/user-profile/user").set(authHeader(CANDIDATE)).send({ role: "admin" });
    expect(res.status).toBe(400);
  });
});

describe("notifications", () => {
  it("scopes the list to the requester, even for an admin", async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    await request(app).get("/api/notifications").set(authHeader(ADMIN));
    expect(prisma.notification.findMany.mock.calls[0][0].where).toMatchObject({ userId: ADMIN.id });
  });

  it("blocks marking someone else's notification as read", async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 5, userId: CANDIDATE_2.id, d_status: "active" });

    const res = await request(app).patch("/api/notifications/5/read").set(authHeader(CANDIDATE));

    expect(res.status).toBe(403);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});

describe("jobs", () => {
  it("shows candidates only approved postings", async () => {
    prisma.job.findMany.mockResolvedValue([]);
    await request(app).get("/api/jobs").set(authHeader(CANDIDATE));
    expect(prisma.job.findMany.mock.calls[0][0].where).toMatchObject({ status: "approved" });
  });

  it("scopes a company to its own postings", async () => {
    prisma.job.findMany.mockResolvedValue([]);
    await request(app).get("/api/jobs").set(authHeader(COMPANY));
    expect(prisma.job.findMany.mock.calls[0][0].where).toMatchObject({ companyId: COMPANY.companyId });
  });

  it("blocks a candidate from reading an unapproved posting directly", async () => {
    prisma.job.findFirst.mockResolvedValue({ id: 50, status: "pending", d_status: "active" });
    const res = await request(app).get("/api/jobs/50").set(authHeader(CANDIDATE));
    expect(res.status).toBe(403);
  });

  it("does not let a company self-approve its posting on create", async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 11, name: "Acme" });
    prisma.job.create.mockResolvedValue({ id: 50, title: "Engineer", company: "Acme" });

    await request(app)
      .post("/api/jobs")
      .set(authHeader(COMPANY))
      .send({ title: "Engineer", company: "Acme", status: "approved" });

    expect(prisma.job.create.mock.calls[0][0].data.status).toBe("pending_payment");
  });

  it("rejects a non-numeric job id with 400, not 500", async () => {
    const res = await request(app).get("/api/jobs/abc").set(authHeader(CANDIDATE));
    expect(res.status).toBe(400);
  });
});
