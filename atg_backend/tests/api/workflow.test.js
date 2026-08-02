import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { loadApp, authHeader, ADMIN, OPERATOR, OPERATOR_2, CANDIDATE } from "../helpers/app.js";
import { prisma, resetPrismaMock } from "../helpers/prismaMock.js";
import rateLimit from "../../middlewares/rateLimit.middleware.js";

const app = await loadApp();

const application = (overrides = {}) => ({
  id: 100,
  userId: CANDIDATE.id,
  staffId: null,
  jobId: 50,
  scholarshipId: null,
  status: "requested",
  fitScore: null,
  d_status: "active",
  createdAt: new Date(),
  user: { id: CANDIDATE.id, name: "Cand Idate", email: "candidate@example.com" },
  staff: null,
  job: { id: 50, title: "Engineer", company: "Acme", companyId: 11 },
  scholarship: null,
  ...overrides,
});

const candidate = (overrides = {}) => ({
  id: CANDIDATE.id,
  name: "Cand Idate",
  email: "candidate@example.com",
  role: "candidate",
  appsUsed: 0,
  appsTotal: 10,
  capacity: 5,
  d_status: "active",
  ...overrides,
});

beforeEach(() => {
  resetPrismaMock();
  rateLimit.reset();
});

describe("link-request → fit review → confirm flow", () => {
  it("records a link request without spending quota", async () => {
    prisma.user.findUnique.mockResolvedValue(candidate());
    prisma.candidateApplication.create.mockResolvedValue(application({ status: "link_request" }));
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "link_request" }));

    const res = await request(app)
      .post("/api/applications/link-request")
      .set(authHeader(CANDIDATE))
      .send({ jobLinkRequest: "https://jobs.example.com/posting/1" });

    expect(res.status).toBe(201);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("spends exactly one application when the candidate confirms", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "fit_reviewed" }));
    prisma.candidateApplication.update.mockResolvedValue(application({ status: "candidate_applied" }));
    prisma.user.findUnique.mockResolvedValue(candidate({ appsUsed: 3 }));
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app).patch("/api/applications/100/confirm-apply").set(authHeader(CANDIDATE));

    expect(res.status).toBe(200);
    // One conditional UPDATE does both the check and the increment, so the
    // database arbitrates the last slot instead of a read-then-write pair.
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: CANDIDATE.id,
          appsUsed: { lt: expect.objectContaining({ _fieldRef: "appsTotal" }) },
        }),
        data: { appsUsed: { increment: 1 } },
      })
    );
  });

  it("refuses to confirm when another request took the last slot first", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "fit_reviewed" }));
    prisma.user.findUnique.mockResolvedValue(candidate({ appsUsed: 3 }));
    // The row no longer satisfied appsUsed < appsTotal by the time the UPDATE ran.
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app).patch("/api/applications/100/confirm-apply").set(authHeader(CANDIDATE));

    expect(res.status).toBe(400);
    expect(prisma.candidateApplication.update).not.toHaveBeenCalled();
  });

  it("refuses to confirm before an operator has reviewed the fit", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "link_request" }));

    const res = await request(app).patch("/api/applications/100/confirm-apply").set(authHeader(CANDIDATE));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses a second confirmation of the same application", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "candidate_applied" }));

    const res = await request(app).patch("/api/applications/100/confirm-apply").set(authHeader(CANDIDATE));

    expect(res.status).toBe(400);
  });

  it("refuses a fit review on an application in the wrong state", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "completed" }));

    const res = await request(app)
      .patch("/api/applications/100/fit-review")
      .set(authHeader(OPERATOR))
      .send({ fitScore: 80 });

    expect(res.status).toBe(400);
  });

  it("stops an operator reviewing an application another operator booked", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(
      application({ status: "link_request", staffId: OPERATOR_2.id })
    );

    const res = await request(app)
      .patch("/api/applications/100/fit-review")
      .set(authHeader(OPERATOR))
      .send({ fitScore: 80 });

    expect(res.status).toBe(403);
  });

  it("lets an admin review regardless of who booked it", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(
      application({ status: "link_request", staffId: OPERATOR_2.id })
    );
    prisma.candidateApplication.update.mockResolvedValue(application({ status: "fit_reviewed" }));

    const res = await request(app)
      .patch("/api/applications/100/fit-review")
      .set(authHeader(ADMIN))
      .send({ fitScore: 80 });

    expect(res.status).toBe(200);
  });
});

describe("operator booking capacity", () => {
  it("refuses to book past the operator's capacity", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application());
    prisma.user.findUnique.mockResolvedValue({ id: OPERATOR.id, name: "Op", capacity: 2 });
    prisma.candidateApplication.count.mockResolvedValue(2);

    const res = await request(app).patch("/api/applications/100/book").set(authHeader(OPERATOR));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/capacity/i);
  });

  it("refuses to book an application another operator already holds", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ staffId: OPERATOR_2.id }));

    const res = await request(app).patch("/api/applications/100/book").set(authHeader(OPERATOR));

    expect(res.status).toBe(400);
  });

  it("leaves a link request awaiting its fit review when booked", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "link_request" }));
    prisma.user.findUnique.mockResolvedValue({ id: OPERATOR.id, name: "Op", capacity: 5 });
    prisma.candidateApplication.count.mockResolvedValue(0);
    prisma.candidateApplication.update.mockResolvedValue(application({ status: "link_request" }));

    await request(app).patch("/api/applications/100/book").set(authHeader(OPERATOR));

    expect(prisma.candidateApplication.update.mock.calls[0][0].data.status).toBe("link_request");
  });
});

describe("application feedback", () => {
  it("only accepts feedback once the application is completed", async () => {
    prisma.candidateApplication.findFirst.mockResolvedValue(application({ status: "processing" }));

    const res = await request(app)
      .post("/api/applications/100/feedback")
      .set(authHeader(CANDIDATE))
      .send({ rating: 5, text: "Great" });

    expect(res.status).toBe(400);
  });
});

describe("candidate approval", () => {
  it("requires a comment when the candidate rejects", async () => {
    const res = await request(app)
      .patch("/api/applications/100/candidate-approval")
      .set(authHeader(CANDIDATE))
      .send({ approved: false });

    expect(res.status).toBe(400);
  });
});

describe("change requests", () => {
  it("rejects a request carrying fields outside the editable set", async () => {
    const res = await request(app)
      .post("/api/requests")
      .set(authHeader(OPERATOR))
      .send({
        type: "edit_user",
        targetId: CANDIDATE.id,
        reason: "Quota bump",
        details: { d_status: "inactive", password: "Hijacked123!" },
      });

    expect(res.status).toBe(400);
    expect(prisma.changeRequest.create).not.toHaveBeenCalled();
  });

  it("refuses to apply an already-processed request", async () => {
    prisma.changeRequest.findFirst.mockResolvedValue({ id: 1, status: "approved", type: "edit_user", details: "{}" });

    const res = await request(app).patch("/api/requests/1/approve").set(authHeader(ADMIN));

    expect(res.status).toBe(400);
  });

  it("does not let an operator approve their own request", async () => {
    const res = await request(app).patch("/api/requests/1/approve").set(authHeader(OPERATOR));
    expect(res.status).toBe(403);
  });
});

describe("payments", () => {
  it("credits the purchased application count only on the first confirmation", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 1,
      userId: CANDIDATE.id,
      status: "completed",
      paid: true,
      appsCount: 10,
      d_status: "active",
    });
    prisma.payment.update.mockResolvedValue({ id: 1, userId: CANDIDATE.id, status: "completed", paid: true, appsCount: 10 });

    await request(app).patch("/api/payments/1").set(authHeader(ADMIN)).send({ status: "completed" });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("credits the purchased application count when a pending payment is confirmed", async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 1,
      userId: CANDIDATE.id,
      status: "pending",
      paid: false,
      appsCount: 10,
      d_status: "active",
    });
    prisma.payment.update.mockResolvedValue({
      id: 1,
      userId: CANDIDATE.id,
      status: "completed",
      paid: true,
      appsCount: 10,
      jobId: null,
    });

    await request(app).patch("/api/payments/1").set(authHeader(ADMIN)).send({ status: "completed" });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { appsTotal: { increment: 10 } } })
    );
  });
});

describe("uploads", () => {
  it("refuses an HTML file dressed up as a profile photo", async () => {
    const res = await request(app)
      .post("/api/users/profile-photo")
      .set(authHeader(CANDIDATE))
      .attach("photo", Buffer.from("<script>alert(1)</script>"), {
        filename: "evil.html",
        contentType: "text/html",
      });

    expect(res.status).toBe(400);
  });

  it("refuses an SVG, which browsers execute as script", async () => {
    const res = await request(app)
      .post("/api/users/profile-photo")
      .set(authHeader(CANDIDATE))
      .attach("photo", Buffer.from("<svg onload=alert(1)>"), {
        filename: "evil.svg",
        contentType: "image/svg+xml",
      });

    expect(res.status).toBe(400);
  });

  it("refuses an executable renamed with an allowed extension", async () => {
    const res = await request(app)
      .post("/api/users/profile-photo")
      .set(authHeader(CANDIDATE))
      .attach("photo", Buffer.from("MZ"), { filename: "payload.png", contentType: "application/x-msdownload" });

    expect(res.status).toBe(400);
  });

  it("accepts a genuine image", async () => {
    const res = await request(app)
      .post("/api/users/profile-photo")
      .set(authHeader(CANDIDATE))
      .attach("photo", Buffer.from("\x89PNG\r\n\x1a\n"), { filename: "me.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.data.fileUrl).toMatch(/^\/uploads\//);
  });
});
