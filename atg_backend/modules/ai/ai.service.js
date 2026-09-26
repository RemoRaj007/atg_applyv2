const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");
const nim = require("./nim.client");
const prompts = require("./ai.prompts");
const { shareableProfile, sharingPreview, canShareColumn } = require("./ai.context");
const { calculateFitScore, loadCandidateData } = require("../jobs/fitScore.service");

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DESCRIPTION_CHARS = 6000;

// Calls per candidate per rolling 24 hours. The per-IP limiter on the routes is
// per serverless instance (see rateLimit.middleware.js), so this database count
// is the real cap on what one account can spend.
const dailyLimit = () => Number(process.env.AI_DAILY_LIMIT) || 20;

const usedToday = (userId) =>
  prisma.aiRequest.count({
    where: { userId, createdAt: { gte: new Date(Date.now() - DAY_MS) }, status: { not: "rejected" } },
  });

const status = async (userId) => {
  const used = await usedToday(userId);
  const limit = dailyLimit();
  return {
    enabled: nim.isConfigured(),
    model: nim.config().model,
    promptVersion: prompts.PROMPT_VERSION,
    dailyLimit: limit,
    usedToday: used,
    remainingToday: Math.max(0, limit - used),
  };
};

const preview = (userId) => sharingPreview(userId);

// ─── Targets ──────────────────────────────────────────────────────────────

const clip = (text, max) => {
  const s = String(text ?? "");
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// Same visibility rule the jobs API applies to a candidate: approved and active
// only. Anything else is a 404, so the AI endpoints cannot be used to confirm
// that an unpublished posting exists.
const loadJob = async (id) => {
  const job = await prisma.job.findFirst({
    where: { id, d_status: "active", status: "approved" },
    include: { companyRel: true },
  });
  if (!job) throw ApiError.notFound("Job not found");
  return {
    raw: job,
    target: {
      type: "job",
      title: job.title,
      organisation: job.companyRel?.name || job.company || null,
      location: [job.location, job.locationType].filter(Boolean).join(" · ") || null,
      experience: job.experience || null,
      deadline: isoDate(job.deadline),
      description: clip(job.description, MAX_DESCRIPTION_CHARS),
    },
  };
};

const loadScholarship = async (id) => {
  const s = await prisma.scholarship.findFirst({ where: { id, d_status: "active" } });
  if (!s) throw ApiError.notFound("Scholarship not found");
  return {
    raw: s,
    target: {
      type: "scholarship",
      title: s.title,
      organisation: s.provider,
      amount: s.amount ? String(s.amount) : null,
      deadline: isoDate(s.deadline),
      description: clip(s.description, MAX_DESCRIPTION_CHARS),
    },
  };
};

// ─── The one path every feature takes to the provider ─────────────────────

/**
 * Quota check → provider call → audit row. The row is written whether the call
 * succeeded or not, so provider failures still count against the quota (they
 * can still cost money) and still show up in the trail.
 */
const run = async ({ userId, feature, messages, sharedCodes, includedLimited, maxTokens, temperature }) => {
  const used = await usedToday(userId);
  if (used >= dailyLimit()) {
    throw new ApiError(429, `You have used today's ${dailyLimit()} AI requests. They reset over the next 24 hours.`);
  }

  const model = nim.config().model;
  const audit = (data) =>
    prisma.aiRequest
      .create({
        data: {
          userId,
          feature,
          model,
          promptVersion: prompts.PROMPT_VERSION,
          sharedCodes,
          includedLimited,
          ...data,
        },
      })
      // The audit row must never turn a delivered answer into an error.
      .catch(() => null);

  try {
    const result = await nim.chat({ messages, maxTokens, temperature });
    await audit({
      status: "ok",
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      latencyMs: result.latencyMs,
    });
    activityLogger.activity(`AI ${feature}`, { userId, fields: sharedCodes.length, includedLimited });
    return { ...result, remainingToday: Math.max(0, dailyLimit() - used - 1) };
  } catch (err) {
    await audit({ status: err.statusCode === 504 ? "timeout" : "provider_error" });
    throw err;
  }
};

const uniqueCodes = (fields) => [...new Set(fields.map((f) => f.code))];

// ─── Features ─────────────────────────────────────────────────────────────

const countPlaceholders = (text) => (text.match(/\[ADD:[^\]]*\]/g) || []).length;

const draftApplication = async (userId, { targetType, targetId, tone, language, includeLimited }) => {
  const { target } = targetType === "scholarship" ? await loadScholarship(targetId) : await loadJob(targetId);
  const { fields, withheld } = await shareableProfile(userId, { includeLimited });

  const result = await run({
    userId,
    feature: "application_draft",
    messages: prompts.applicationDraft({ target, fields, tone, language }),
    sharedCodes: uniqueCodes(fields),
    includedLimited: includeLimited,
    maxTokens: 1100,
    temperature: 0.7,
  });

  return {
    draft: result.text,
    // Each placeholder is a fact the letter needs and the profile lacked. The UI
    // lists them so they get filled in rather than sent as "[ADD: …]".
    placeholders: countPlaceholders(result.text),
    truncated: result.finishReason === "length",
    sharedFieldCount: fields.length,
    withheld,
    model: result.model,
    promptVersion: prompts.PROMPT_VERSION,
    remainingToday: result.remainingToday,
  };
};

// Model output is asked for as JSON but is not trusted to be JSON: take the
// outermost object if there is one, keep only string entries, cap the lists.
const parseFitJson = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      const list = (v, n) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, n) : []);
      if (typeof obj.summary === "string") {
        return { summary: obj.summary, strengths: list(obj.strengths, 3), gaps: list(obj.gaps, 3), actions: list(obj.actions, 3) };
      }
    } catch {
      // fall through to the plain-text shape
    }
  }
  return { summary: text, strengths: [], gaps: [], actions: [] };
};

const explainFit = async (userId, { jobId, language, includeLimited }) => {
  const { raw, target } = await loadJob(jobId);
  // The score comes from the existing deterministic rules and is passed to the
  // model as a given. The model explains it; it never produces it.
  const fit = calculateFitScore(raw, await loadCandidateData(userId));
  const { fields, withheld } = await shareableProfile(userId, { includeLimited });

  const result = await run({
    userId,
    feature: "fit_explanation",
    messages: prompts.fitExplanation({ target, fields, fit, language }),
    sharedCodes: uniqueCodes(fields),
    includedLimited: includeLimited,
    maxTokens: 700,
    temperature: 0.3,
  });

  return {
    fitScore: fit.fitScore,
    breakdown: fit.breakdown,
    explanation: parseFitJson(result.text),
    withheld,
    model: result.model,
    promptVersion: prompts.PROMPT_VERSION,
    remainingToday: result.remainingToday,
  };
};

const polishAnswer = async (userId, { code, answer, language, includeLimited }) => {
  const column = await prisma.profileColumn.findFirst({ where: { code, active: true, d_status: "active" } });
  if (!column) throw ApiError.notFound("Question not found");
  // The answer arrives in the request body, not from the database, but its
  // question's policy still governs whether it may leave the platform.
  if (!canShareColumn(column, { includeLimited })) {
    throw ApiError.forbidden("This answer is marked private, so it is never sent to the AI service.");
  }

  const result = await run({
    userId,
    feature: "answer_polish",
    messages: prompts.answerPolish({ question: column.label, answer, language }),
    sharedCodes: [column.code],
    includedLimited: includeLimited,
    maxTokens: 800,
    temperature: 0.3,
  });

  return { answer: result.text, model: result.model, promptVersion: prompts.PROMPT_VERSION, remainingToday: result.remainingToday };
};

module.exports = { status, preview, draftApplication, explainFit, polishAnswer, parseFitJson, countPlaceholders };
