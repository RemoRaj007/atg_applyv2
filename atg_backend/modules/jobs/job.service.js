const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");
const { annotateJobsWithFitScore } = require("./fitScore.service");
const notificationService = require("../notifications/notification.service");

const list = async (requester) => {
  const where = { d_status: "active" };
  
  if (requester) {
    if (requester.role === "candidate" || requester.role === "visitor") {
      where.status = "approved";
    } else if (requester.role === "company") {
      where.companyId = requester.companyId || -1;
    }
  } else {
    where.status = "approved";
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { jobRole: true },
  });

  // If candidate requesting, compute and attach comprehensive fitScore
  if (requester && requester.role === "candidate") {
    return await annotateJobsWithFitScore(jobs, requester.id);
  }

  return jobs;
};

const getById = async (id, requester) => {
  const numericId = Number(id);
  if (isNaN(numericId)) throw ApiError.badRequest("Invalid job ID");

  const job = await prisma.job.findFirst({
    where: { id: numericId, d_status: "active" },
    include: {
      jobRole: true,
      skills: {
        where: { d_status: "active" },
        include: { skill: true },
      },
    },
  });
  if (!job) throw ApiError.notFound("Job not found");

  if (requester) {
    if ((requester.role === "candidate" || requester.role === "visitor") && job.status !== "approved") {
      throw ApiError.forbidden("You do not have access to this job post");
    }
    if (requester.role === "company" && job.companyId !== requester.companyId) {
      throw ApiError.forbidden("You do not have access to this job post");
    }
  }

  return job;
};

const create = async (data, requester) => {
  const jobData = { ...data };
  if (requester.role === "company") {
    jobData.companyId = requester.companyId;
    jobData.status = "pending_payment";
    
    // Find company name
    const company = await prisma.company.findFirst({ where: { id: requester.companyId } });
    jobData.company = company ? company.name : "Company";
  } else {
    jobData.status = "approved";
  }

  const job = await prisma.job.create({ data: jobData });
  activityLogger.activity("Job created", { jobId: job.id, company: job.company, title: job.title, status: job.status });

  // Notifications
  if (requester.role === "company") {
    notificationService.notifyUser({
      userId: requester.id,
      type: "job_created",
      title: "Job Submitted",
      body: `Your job post for "${job.title}" has been created and is pending payment/approval.`,
    }).catch(() => {});
    notificationService.notifyRoles({
      roles: ["admin", "operator"],
      type: "job_created",
      title: "New Job Submitted",
      body: `Company ${job.company} submitted a new job: "${job.title}".`,
    }).catch(() => {});
  } else {
    notificationService.notifyRoles({
      roles: ["candidate"],
      type: "job_created",
      title: `New Job Opening: ${job.title}`,
      body: `A new job "${job.title}" at ${job.company} has been published.`,
    }).catch(() => {});
  }

  return job;
};

const update = async (id, data, requester) => {
  const job = await getById(id, requester);
  if (requester.role === "company" && job.companyId !== requester.companyId) {
    throw ApiError.forbidden("You can only edit your own company's job posts");
  }

  const updatedJob = await prisma.job.update({ where: { id }, data });
  activityLogger.activity("Job updated", { jobId: updatedJob.id, fields: Object.keys(data) });
  return updatedJob;
};

const approve = async (id, status) => {
  const job = await prisma.job.findFirst({ where: { id, d_status: "active" } });
  if (!job) throw ApiError.notFound("Job not found");

  const updatedJob = await prisma.job.update({
    where: { id },
    data: { status },
  });
  activityLogger.activity(`Job post approval ${status}`, { jobId: id, status });

  if (status === "approved") {
    if (job.companyId) {
      notificationService.notifyCompanyUsers({
        companyId: job.companyId,
        type: "job_approved",
        title: "Job Approved",
        body: `Your job posting "${job.title}" has been approved and is now live!`,
      }).catch(() => {});
    }
    notificationService.notifyRoles({
      roles: ["candidate"],
      type: "job_approved",
      title: `New Job Opening: ${job.title}`,
      body: `A new job "${job.title}" at ${job.company} is now open for applications.`,
    }).catch(() => {});
  }

  return updatedJob;
};


const remove = async (id) => {
  const job = await prisma.job.findFirst({ where: { id, d_status: "active" } });
  if (!job) throw ApiError.notFound("Job not found");

  await prisma.job.update({ where: { id }, data: { d_status: "inactive" } });
  activityLogger.activity("Job deleted", { jobId: id });
};

const getRecommendations = async (requester) => {
  const jobs = await list(requester);
  const scholarships = await prisma.scholarship.findMany({
    where: { d_status: "active" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return { jobs, scholarships };
};

module.exports = { list, getById, create, update, approve, remove, getRecommendations };
