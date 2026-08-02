const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");
const { sendEmail } = require("../notifications/email.service");
const { sendSms } = require("../notifications/sms.service");
const { matchResumeToJob } = require("../../utils/apify.service");
const { calculateFitScore, loadCandidateData } = require("../jobs/fitScore.service");
const notificationService = require("../notifications/notification.service");

const getInclude = (requester) => {
  const role = requester?.role || "candidate";
  return { 
    job: true, 
    scholarship: true,
    user: { select: { id: true, name: true, email: true } }, 
    staff: { select: { id: true, name: true, email: true, phone: true } },
    formValues: {
      where: { d_status: "active" },
      include: {
        column: true
      }
    },
    comments: {
      where: role === "candidate" ? { type: "public", d_status: "active" } : { d_status: "active" },
      include: {
        sender: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: "asc" }
    }
  };
};

// Candidates see their own; companies see applications for their jobs; operators/admins see everything
const list = async (requester, query = {}) => {
  const where = { d_status: "active" };
  if (requester.role === "candidate") {
    where.userId = requester.id;
  } else if (requester.role === "company") {
    where.job = { companyId: requester.companyId || -1 };
  } else if (requester.role === "operator") {
    if (query.staffId) {
      if (query.staffId === "null") {
        where.staffId = null;
      } else {
        where.staffId = Number(query.staffId);
      }
    }
  }
  return prisma.candidateApplication.findMany({ where, include: getInclude(requester), orderBy: { createdAt: "desc" } });
};

const getById = async (id, requester) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" }, include: getInclude(requester) });
  if (!application) throw ApiError.notFound("Application not found");

  if (requester.role === "candidate" && application.userId !== requester.id) {
    throw ApiError.forbidden("You do not have access to this application");
  }
  // A company is only ever entitled to applications against its own postings.
  // Guarding on `application.job` being present let scholarship applications and
  // job-link requests — which carry no job — through the check entirely.
  if (requester.role === "company" && application.job?.companyId !== requester.companyId) {
    throw ApiError.forbidden("You do not have access to this application");
  }
  return application;
};

const create = async (data, requester) => {
  const applicationData = { ...data };
  const candidateComment = data.comment;
  delete applicationData.comment;

  if (applicationData.scholarshipId) {
    applicationData.scholarshipId = Number(applicationData.scholarshipId);
    if (!applicationData.jobId) delete applicationData.jobId;
  }
  if (applicationData.jobId) {
    applicationData.jobId = Number(applicationData.jobId);
    if (!applicationData.scholarshipId) delete applicationData.scholarshipId;
  }

  if (requester.role === "candidate") {
    applicationData.userId = requester.id;
    applicationData.staffId = null;
    applicationData.status = "requested";
    applicationData.candidateApproval = false;
  } else {
    applicationData.status = "requested";
    if (!applicationData.userId) {
      applicationData.userId = requester.id;
      applicationData.staffId = null;
    } else {
      applicationData.staffId = requester.id;
    }
  }

  // Verify candidate limits
  const user = await prisma.user.findUnique({ where: { id: applicationData.userId } });
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  if (user.role === "candidate" && user.appsUsed >= user.appsTotal) {
    throw ApiError.badRequest("You have reached your application limit. Please upgrade or subscribe to apply for more roles.");
  }

  // Calculate fitScore and successRate using local fitScore service
  try {
    const candidateData = await loadCandidateData(applicationData.userId);
    if (applicationData.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: applicationData.jobId },
        include: {
          skills: {
            where: { d_status: "active" },
            include: { skill: true }
          }
        }
      });

      if (candidateData && job) {
        const { fitScore, successRate } = calculateFitScore(job, candidateData);
        applicationData.fitScore = fitScore;
        applicationData.successRate = successRate;
      }
    } else if (applicationData.scholarshipId) {
      applicationData.fitScore = 100;
      applicationData.successRate = 100;
    }
  } catch (err) {
    console.error("Error matching resume to job:", err);
  }

  const application = await prisma.candidateApplication.create({ data: applicationData, include: getInclude(requester) });

  // Increment user's appsUsed count
  await prisma.user.update({
    where: { id: application.userId },
    data: { appsUsed: { increment: 1 } },
  });

  if (candidateComment && candidateComment.trim()) {
    await prisma.applicationComment.create({
      data: {
        applicationId: application.id,
        senderId: requester.id,
        text: candidateComment.trim(),
        type: "public"
      }
    });
  }

  activityLogger.activity("Application created", {
    applicationId: application.id,
    userId: application.userId,
    jobId: application.jobId,
    scholarshipId: application.scholarshipId,
    status: application.status,
  });

  const appTitle = application.job ? `${application.job.title} @ ${application.job.company}` : `${application.scholarship?.title || "Scholarship"}`;
  
  // Send Notifications
  notificationService.notifyUser({
    userId: application.userId,
    type: "application_created",
    title: "Application Submitted",
    body: `Your application for "${appTitle}" has been successfully submitted.`
  }).catch(() => {});

  if (application.job && application.job.companyId) {
    notificationService.notifyCompanyUsers({
      companyId: application.job.companyId,
      type: "application_received",
      title: "New Application Received",
      body: `${application.user?.name || "A candidate"} applied for "${application.job.title}".`
    }).catch(() => {});
  }

  notificationService.notifyRoles({
    roles: ["admin", "operator"],
    type: "application_created",
    title: "New Application",
    body: `${application.user?.name || "Candidate"} applied for "${appTitle}".`
  }).catch(() => {});

  return getById(application.id, requester);
};

// ─── NEW: Candidate submits a job link to operator (NO quota consumed) ───────
const createLinkRequest = async (data, requester) => {
  if (requester.role !== "candidate") {
    throw ApiError.forbidden("Only candidates can submit job link requests");
  }

  const user = await prisma.user.findUnique({ where: { id: requester.id } });
  if (!user) throw ApiError.notFound("User not found");

  const applicationData = {
    userId: requester.id,
    staffId: null,
    status: "link_request",
    candidateApproval: false,
    jobLinkRequest: data.jobLinkRequest,
  };

  const application = await prisma.candidateApplication.create({
    data: applicationData,
    include: getInclude(requester),
  });

  // Add optional comment
  if (data.comment && data.comment.trim()) {
    await prisma.applicationComment.create({
      data: {
        applicationId: application.id,
        senderId: requester.id,
        text: data.comment.trim(),
        type: "public"
      }
    });
  }

  activityLogger.activity("Job link request submitted by candidate", {
    applicationId: application.id,
    userId: requester.id,
    jobLinkRequest: data.jobLinkRequest,
  });

  // Notify operators
  notificationService.notifyRoles({
    roles: ["admin", "operator"],
    type: "link_request_received",
    title: "New Job Link Request",
    body: `${user.name} submitted a job link for review: ${data.jobLinkRequest.substring(0, 80)}...`
  }).catch(() => {});

  // Notify candidate of submission
  notificationService.notifyUser({
    userId: requester.id,
    type: "link_request_submitted",
    title: "Job Link Submitted",
    body: "Your job link has been sent to our operator team for a fit review. We'll notify you once the assessment is ready."
  }).catch(() => {});

  return getById(application.id, requester);
};

// ─── NEW: Operator submits fit assessment for a link request ─────────────────
const submitFitReview = async (id, data, requester) => {
  if (requester.role !== "operator" && requester.role !== "admin") {
    throw ApiError.forbidden("Only operators or admins can submit fit reviews");
  }

  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");
  if (application.status !== "link_request" && application.status !== "processing") {
    throw ApiError.badRequest("Fit review can only be submitted for link requests in 'link_request' or 'processing' status");
  }
  if (application.staffId && application.staffId !== requester.id && requester.role !== "admin") {
    throw ApiError.forbidden("This application is booked by another operator");
  }

  const updated = await prisma.candidateApplication.update({
    where: { id },
    data: {
      fitScore: data.fitScore,
      operatorFitNote: data.operatorFitNote || null,
      status: "fit_reviewed",
      staffId: application.staffId || requester.id,
    },
    include: getInclude({ role: "operator" }),
  });

  // Notify candidate
  notificationService.notifyUser({
    userId: updated.userId,
    type: "fit_review_received",
    title: "Fit Assessment Ready!",
    body: `Your operator has reviewed your job link and given a fit score of ${data.fitScore}%. Open your applications to review and confirm your application.`
  }).catch(() => {});

  activityLogger.activity("Fit review submitted by operator", {
    applicationId: id,
    operatorId: requester.id,
    fitScore: data.fitScore,
  });

  return updated;
};

// ─── NEW: Candidate confirms they want to apply (QUOTA consumed here) ────────
const confirmApply = async (id, requester) => {
  if (requester.role !== "candidate") {
    throw ApiError.forbidden("Only candidates can confirm their application");
  }

  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");
  if (application.userId !== requester.id) {
    throw ApiError.forbidden("You do not have access to this application");
  }
  if (application.status !== "fit_reviewed") {
    throw ApiError.badRequest("You can only confirm applications that have been reviewed by an operator");
  }

  // Check quota BEFORE incrementing
  const user = await prisma.user.findUnique({ where: { id: requester.id } });
  if (!user) throw ApiError.notFound("User not found");
  if (user.appsUsed >= user.appsTotal) {
    throw ApiError.badRequest("You have reached your application limit. Please upgrade or subscribe to apply for more roles.");
  }

  const updated = await prisma.candidateApplication.update({
    where: { id },
    data: {
      status: "candidate_applied",
      appliedAt: new Date(),
      candidateApproval: true,
    },
    include: getInclude(requester),
  });

  // NOW increment appsUsed
  await prisma.user.update({
    where: { id: requester.id },
    data: { appsUsed: { increment: 1 } },
  });

  // Notify operators/admins
  notificationService.notifyRoles({
    roles: ["admin", "operator"],
    type: "candidate_confirmed_apply",
    title: "Candidate Confirmed Application",
    body: `${user.name} confirmed their application after reviewing the fit assessment (Score: ${updated.fitScore}%).`
  }).catch(() => {});

  // Notify candidate
  notificationService.notifyUser({
    userId: requester.id,
    type: "application_confirmed",
    title: "Application Confirmed!",
    body: `You've successfully applied! An operator will now process your application.`
  }).catch(() => {});

  if (updated.staff) {
    notificationService.notifyUser({
      userId: updated.staff.id,
      type: "candidate_confirmed_apply",
      title: "Candidate Confirmed",
      body: `${user.name} confirmed their application. Please proceed with processing.`
    }).catch(() => {});
  }

  activityLogger.activity("Candidate confirmed application after fit review", {
    applicationId: id,
    userId: requester.id,
    fitScore: updated.fitScore,
  });

  return getById(id, requester);
};

// Notifies the candidate of any status updates on their application
const sendStatusUpdateEmail = (application, previousStatus) => {
  if (!application.user || !application.user.email) return;
  if (application.status === previousStatus) return;

  const title = application.job ? `${application.job.title} @ ${application.job.company}` : `${application.scholarship?.title || "Scholarship"}`;
  const subject = `[ATG Apply] Application Status Updated: ${title}`;
  const body = `Hello ${application.user.name},\n\nYour application status for "${title}" has been updated to: ${application.status}.\n\nBest regards,\nATG Apply Team`;

  sendEmail({
    to: application.user.email,
    subject,
    body,
  }).catch(() => {});

  // System Notification for Candidate
  notificationService.notifyUser({
    userId: application.userId,
    type: "application_status_changed",
    title: "Application Status Updated",
    body: `Your application status for "${title}" was updated to: ${application.status}.`
  }).catch(() => {});

  // Notification for Company if applicable
  if (application.job && application.job.companyId) {
    notificationService.notifyCompanyUsers({
      companyId: application.job.companyId,
      type: "application_status_changed",
      title: "Application Status Changed",
      body: `Candidate ${application.user?.name}'s application for "${application.job.title}" is now: ${application.status}.`
    }).catch(() => {});
  }
};

// Notifies the assigned staff member that the candidate has responded to a recommendation
const notifyStaffOfDecision = (application, approved) => {
  if (!application.staff) return;

  const decision = approved ? "approved" : "rejected";
  const title = application.job ? `${application.job.title} @ ${application.job.company}` : `${application.scholarship?.title} by ${application.scholarship?.provider}`;
  const subject = `Application ${decision}: ${title}`;
  const body = `${application.user.name} has ${decision} the recommendation for ${title}.`;

  sendEmail({ to: application.staff.email, subject, body }).catch(() => {});
  if (application.staff.phone) {
    sendSms({ phone: application.staff.phone, message: `${subject}. ${body}` }).catch(() => {});
  }

  notificationService.notifyUser({
    userId: application.staff.id,
    type: "candidate_decision",
    title: `Candidate ${decision.toUpperCase()} Recommendation`,
    body: `${application.user.name} ${decision} the recommendation for "${title}".`
  }).catch(() => {});
};

const setCandidateApproval = async (id, requester, approved, comment) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");
  if (application.userId !== requester.id) {
    throw ApiError.forbidden("You do not have access to this application");
  }

  if (!approved && (!comment || !comment.trim())) {
    throw ApiError.badRequest("Comment is required when rejecting");
  }

  const updated = await prisma.candidateApplication.update({
    where: { id },
    data: { 
      candidateApproval: approved, 
      status: approved ? "approved" : "rejected",
      candidateComment: comment 
    },
    include: getInclude(requester),
  });

  if (comment && comment.trim()) {
    await prisma.applicationComment.create({
      data: {
        applicationId: id,
        senderId: requester.id,
        text: comment.trim(),
        type: "public"
      }
    });
  }

  activityLogger.activity(approved ? "Application approved by candidate" : "Application rejected by candidate", {
    applicationId: id,
    userId: requester.id,
  });
  sendStatusUpdateEmail(updated, application.status);
  notifyStaffOfDecision(updated, approved);
  return getById(id, requester);
};

const bookApplication = async (id, operatorId) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");
  if (application.staffId) throw ApiError.badRequest("Application already booked by another operator");

  const operator = await prisma.user.findUnique({ where: { id: operatorId } });
  if (!operator) throw ApiError.notFound("Operator not found");

  const activeBookingsCount = await prisma.candidateApplication.count({
    where: {
      staffId: operatorId,
      status: { notIn: ["completed", "rejected", "skipped"] },
      d_status: "active",
    },
  });

  if (activeBookingsCount >= operator.capacity) {
    throw ApiError.badRequest(`You have reached your booking capacity limit of ${operator.capacity} concurrent applications.`);
  }

  // For link_request apps, booking keeps the status as 'link_request' (awaiting fit review)
  const newStatus = application.status === "link_request" ? "link_request" : "processing";

  const updated = await prisma.candidateApplication.update({
    where: { id },
    data: { staffId: operatorId, status: newStatus },
    include: getInclude({ role: "operator" }),
  });

  activityLogger.activity("Application booked by operator", { applicationId: id, operatorId });
  sendStatusUpdateEmail(updated, application.status);

  const title = updated.job ? updated.job.title : (updated.scholarship?.title || updated.jobLinkRequest || "Job Link Request");
  notificationService.notifyUser({
    userId: updated.userId,
    type: "operator_assigned",
    title: "Operator Assigned",
    body: `Operator ${operator.name} has been assigned to review your application.`
  }).catch(() => {});

  return updated;
};

const setQcApproval = async (id, approved, requester) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");

  if (requester && requester.role === "operator" && application.staffId !== requester.id) {
    throw ApiError.forbidden("You can only update QC approval of applications booked by you.");
  }

  const updated = await prisma.candidateApplication.update({
    where: { id },
    data: { qcApproval: approved },
    include: getInclude({ role: "operator" }),
  });
  activityLogger.activity("Application QC approval updated", { applicationId: id, approved });

  const title = updated.job ? updated.job.title : (updated.scholarship?.title || "Scholarship");
  notificationService.notifyUser({
    userId: updated.userId,
    type: "qc_approval_updated",
    title: "Quality Check Update",
    body: `QC approval status for your application "${title}" has been updated to: ${approved ? "PASSED" : "PENDING/FAILED"}.`
  }).catch(() => {});

  return updated;
};

const updateStatus = async (id, data, requester) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");

  if (requester && requester.role === "operator" && application.staffId !== requester.id) {
    throw ApiError.forbidden("You can only update the status of applications booked by you.");
  }

  const updated = await prisma.candidateApplication.update({ 
    where: { id }, 
    data, 
    include: getInclude(requester) 
  });
  activityLogger.activity("Application updated", { applicationId: id, fields: Object.keys(data) });
  sendStatusUpdateEmail(updated, application.status);
  return updated;
};


const addComment = async (id, data, requester) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");

  if (requester && requester.role === "operator" && application.staffId !== requester.id) {
    throw ApiError.forbidden("You can only add comments to applications booked by you.");
  }

  if (requester.role === "candidate") {
    if (application.userId !== requester.id) {
      throw ApiError.forbidden("You do not have access to this application");
    }
    data.type = "public";
  }

  await prisma.applicationComment.create({
    data: {
      applicationId: id,
      senderId: requester.id,
      text: data.text,
      type: data.type || "public"
    }
  });

  return getById(id, requester);
};

const saveFeedback = async (id, data, requester) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");
  if (application.userId !== requester.id) {
    throw ApiError.forbidden("You do not have access to this application");
  }
  if (application.status !== "completed") {
    throw ApiError.badRequest("You can only leave feedback on completed applications");
  }

  await prisma.candidateApplication.update({
    where: { id },
    data: {
      candidateFeedback: data.text,
      candidateFeedbackRating: Number(data.rating)
    }
  });

  return getById(id, requester);
};

const remove = async (id) => {
  const application = await prisma.candidateApplication.findFirst({ where: { id, d_status: "active" } });
  if (!application) throw ApiError.notFound("Application not found");
  await prisma.candidateApplication.update({
    where: { id },
    data: { d_status: "inactive" },
  });
  activityLogger.activity("Application deleted", { applicationId: id });
};

const exportAll = async (requester) => {
  const where = { d_status: "active" };
  if (requester && requester.role === "operator") {
    where.staffId = requester.id;
  }
  return prisma.candidateApplication.findMany({ where, include: getInclude({ role: "admin" }), orderBy: { createdAt: "desc" } });
};

module.exports = { 
  list, 
  getById, 
  create, 
  createLinkRequest,
  submitFitReview,
  confirmApply,
  setCandidateApproval, 
  setQcApproval, 
  updateStatus, 
  addComment, 
  saveFeedback, 
  remove, 
  exportAll,
  bookApplication
};
