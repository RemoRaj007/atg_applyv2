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
    // skills are included so the operator edit modal can prefill them
    // (OperatorJobs.tsx reads job.skills[].skill.name off the list response).
    include: {
      jobRole: true,
      skills: {
        where: { d_status: "active" },
        include: { skill: true },
      },
    },
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

// The job form sends skills as names; JobSkill needs ids. Reuse existing Skill
// rows where the name already matches so the catalog does not sprout duplicates.
const resolveSkillIds = async (names) => {
  const ids = [];
  for (const raw of names) {
    const name = String(raw).trim();
    if (!name) continue;
    const existing = await prisma.skill.findUnique({ where: { name } });
    const skill = existing || (await prisma.skill.create({ data: { name } }));
    ids.push(skill.id);
  }
  return ids;
};

// Flattens the nested jobRequirements the UI posts onto the columns Job actually
// has, and returns the skill names separately since they live in a relation.
const splitJobRequirements = (data) => {
  const { jobRequirements, ...rest } = data;
  if (!jobRequirements) return { jobData: rest, skillNames: null };

  const { experience, locationType, skills } = jobRequirements;
  return {
    jobData: { ...rest, experience, locationType },
    skillNames: Array.isArray(skills) ? skills : null,
  };
};

const create = async (data, requester) => {
  const { jobData: incoming, skillNames } = splitJobRequirements(data);
  const jobData = { ...incoming };
  if (requester.role === "company") {
    jobData.companyId = requester.companyId;
    jobData.status = "pending_payment";
    
    // Find company name
    const company = await prisma.company.findFirst({ where: { id: requester.companyId } });
    jobData.company = company ? company.name : "Company";
  } else {
    jobData.status = "approved";
  }

  if (skillNames && skillNames.length) {
    const skillIds = await resolveSkillIds(skillNames);
    jobData.skills = { create: skillIds.map((skillId) => ({ skillId })) };
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

  const { jobData, skillNames } = splitJobRequirements(data);

  // Only touch the skill links when the caller actually sent a skills array —
  // an update that omits jobRequirements must leave existing links alone.
  if (skillNames) {
    const skillIds = await resolveSkillIds(skillNames);
    jobData.skills = {
      deleteMany: {}, // replace-all, matching jobRole.service.js's semantics
      create: skillIds.map((skillId) => ({ skillId })),
    };
  }

  const updatedJob = await prisma.job.update({ where: { id }, data: jobData });
  activityLogger.activity("Job updated", { jobId: updatedJob.id, fields: Object.keys(jobData) });
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
