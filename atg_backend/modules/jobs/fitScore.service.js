/**
 * ─────────────────────────────────────────────────────────────────
 *  Fit Score Service
 *  Calculates a 0–100 fit score between a candidate's full profile
 *  and a job posting.
 *
 *  Weights (must sum to 100):
 *    Job Role Match      → 30 pts
 *    Skills Match        → 25 pts
 *    Location Match      → 15 pts
 *    Experience Years    → 15 pts
 *    Education Level     → 10 pts
 *    Employment Type     → 5  pts
 * ─────────────────────────────────────────────────────────────────
 */

const { prisma } = require("../../config/db");

// ─── Helpers ─────────────────────────────────────────────────────

/** Total work months for a candidate from their experience records */
function totalExperienceMonths(experiences) {
  return experiences.reduce((sum, exp) => {
    if (!exp.startDate) return sum;
    const start = new Date(exp.startDate);
    const end = exp.isCurrent || !exp.endDate ? new Date() : new Date(exp.endDate);
    const months = Math.max(
      0,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    );
    return sum + months;
  }, 0);
}

/** Normalise a string for fuzzy matching */
function normalise(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Check if two location strings overlap (city or country level) */
function locationsMatch(jobLocation, candidateAddresses) {
  if (!jobLocation) return false;
  const jobLoc = normalise(jobLocation);

  // "remote" / "anywhere" always matches
  if (jobLoc.includes("remote") || jobLoc.includes("anywhere")) return true;

  return candidateAddresses.some((addr) => {
    const addrText = normalise(
      `${addr.city} ${addr.state} ${addr.country}`
    );
    // check each token from jobLoc against addrText
    const tokens = jobLoc.split(" ").filter((t) => t.length > 2);
    return tokens.some((t) => addrText.includes(t));
  });
}

/** Score job-role match (0–1) */
function scoreJobRole(job, userJobRoles) {
  if (!job.jobRoleId) return 0.5; // no role required → neutral
  const matched = userJobRoles.some((ujr) => ujr.jobRoleId === job.jobRoleId);
  return matched ? 1 : 0;
}

/** Score skills match (0–1) — checks UserSkill IDs first, falls back to text matching */
function scoreSkills(jobSkills, userSkills, itSkillTexts = [], otherSkillTexts = []) {
  if (!jobSkills || jobSkills.length === 0) return 0.5; // no skills required → neutral

  // --- ID-based match (UserSkill ↔ JobSkill) ---
  const userSkillIds = new Set((userSkills || []).map((us) => us.skillId));
  const idMatched = jobSkills.filter((js) => userSkillIds.has(js.skillId));

  // --- Text-based fallback (itSkills + otherQualifications text vs job skill names) ---
  const candidateTexts = [
    ...(itSkillTexts || []).map((s) => normalise(s)),
    ...(otherSkillTexts || []).map((s) => normalise(s)),
  ];

  const textMatched = jobSkills.filter((js) => {
    if (idMatched.includes(js)) return false; // already counted
    const skillName = normalise(js.skill?.name || "");
    return skillName && candidateTexts.some((ct) => ct.includes(skillName) || skillName.split(" ").some((token) => token.length > 2 && ct.includes(token)));
  });

  const allMatched = [...idMatched, ...textMatched];

  if (userSkillIds.size === 0 && candidateTexts.length === 0) return 0;

  // Weighted by job skill weight if available
  const totalWeight = jobSkills.reduce((s, js) => s + (js.weight || 1), 0);
  const matchedWeight = allMatched.reduce((s, js) => s + (js.weight || 1), 0);
  return totalWeight > 0 ? matchedWeight / totalWeight : 0;
}

/** Score location (0–1) */
function scoreLocation(job, addresses) {
  const jobLoc = normalise(job.location || "");
  if (!jobLoc || jobLoc.includes("remote") || jobLoc.includes("anywhere")) {
    return 1; // remote = perfect match
  }
  if (addresses.length === 0) return 0;
  return locationsMatch(job.location, addresses) ? 1 : 0;
}

/** Score experience years match (0–1) */
function scoreExperience(job, experiences) {
  const months = totalExperienceMonths(experiences);
  const years = months / 12;

  // Parse required experience from job.experience field
  // e.g., "3", "2-5", "5+", "entry level", etc.
  const expField = normalise(job.experience || "");

  if (!expField || expField.includes("entry") || expField.includes("fresher")) {
    return years >= 0 ? 1 : 0; // no requirement
  }

  // Match "X+" pattern
  const plusMatch = expField.match(/(\d+)\s*\+/);
  if (plusMatch) {
    const required = parseInt(plusMatch[1]);
    return years >= required ? 1 : Math.min(1, years / required);
  }

  // Match "X-Y" range
  const rangeMatch = expField.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    if (years >= min) return 1;
    return Math.min(1, years / min);
  }

  // Match plain number
  const numMatch = expField.match(/(\d+)/);
  if (numMatch) {
    const required = parseInt(numMatch[1]);
    if (years >= required) return 1;
    return Math.min(1, years / required);
  }

  // No parseable requirement — use a soft scale: 1 yr = 0.3, 3 yr = 0.7, 5+ yr = 1.0
  return Math.min(1, years / 5);
}

/** Score education level (0–1) */
function scoreEducation(job, academicQualifications) {
  if (academicQualifications.length === 0) return 0;

  // Grade academic levels
  const levelRank = {
    phd: 6, doctorate: 6,
    master: 5, msc: 5, mba: 5,
    bachelor: 4, bsc: 4, ba: 4, be: 4, btech: 4,
    diploma: 3, hnd: 3,
    certificate: 2, cert: 2,
    secondary: 1, highschool: 1, alevel: 1,
  };

  const bestCandidateRank = Math.max(
    ...academicQualifications.map((aq) => {
      const dl = normalise(aq.degreeLevel);
      for (const [key, rank] of Object.entries(levelRank)) {
        if (dl.includes(key)) return rank;
      }
      return 2; // default: some education
    })
  );

  // Check job's fitReason / source for education hints
  const jobText = normalise(`${job.fitReason || ""} ${job.source || ""} ${job.title || ""}`);

  let requiredRank = 0;
  for (const [key, rank] of Object.entries(levelRank)) {
    if (jobText.includes(key)) {
      requiredRank = Math.max(requiredRank, rank);
    }
  }

  if (requiredRank === 0) return bestCandidateRank >= 3 ? 1 : 0.7; // no requirement → reward having education
  return bestCandidateRank >= requiredRank ? 1 : Math.min(1, bestCandidateRank / requiredRank);
}

/** Score employment type match (0–1) */
function scoreEmploymentType(job, experiences) {
  if (!job.locationType) return 0.5; // unknown → neutral
  const jobType = normalise(job.locationType);

  if (experiences.length === 0) return 0.3;

  const hasMatchingType = experiences.some((exp) => {
    const expType = normalise(exp.employmentType || "");
    return expType && jobType.includes(expType.split(" ")[0]);
  });

  return hasMatchingType ? 1 : 0.4;
}

// ─── Breakdown Labels ─────────────────────────────────────────────

function buildBreakdown(scores) {
  return {
    jobRole: { score: Math.round(scores.jobRole * 30), max: 30, label: "Job Role Match" },
    skills: { score: Math.round(scores.skills * 25), max: 25, label: "Skills Match" },
    location: { score: Math.round(scores.location * 15), max: 15, label: "Location Match" },
    experience: { score: Math.round(scores.experience * 15), max: 15, label: "Experience Level" },
    education: { score: Math.round(scores.education * 10), max: 10, label: "Education Level" },
    employmentType: { score: Math.round(scores.employmentType * 5), max: 5, label: "Employment Type" },
  };
}

// ─── Main Calculator ──────────────────────────────────────────────

/**
 * Calculate fit score for a single candidate against one job.
 *
 * @param {object} job          – Job record (with jobSkills, jobRole)
 * @param {object} candidateData – Full candidate profile data
 * @returns {{ fitScore, successRate, breakdown }}
 */
function calculateFitScore(job, candidateData) {
  const {
    userJobRoles = [],
    userSkills = [],
    addresses = [],
    experiences = [],
    academicQualifications = [],
    itSkillTexts = [],
    otherSkillTexts = [],
    profileAddresses = [],
  } = candidateData;

  // Merge actual addresses with profile-derived location info
  const allAddresses = [...addresses, ...profileAddresses];

  const scores = {
    jobRole: scoreJobRole(job, userJobRoles),
    skills: scoreSkills(job.skills || [], userSkills, itSkillTexts, otherSkillTexts),
    location: scoreLocation(job, allAddresses),
    experience: scoreExperience(job, experiences),
    education: scoreEducation(job, academicQualifications),
    employmentType: scoreEmploymentType(job, experiences),
  };

  const breakdown = buildBreakdown(scores);

  const fitScore = Math.min(
    100,
    Math.round(
      scores.jobRole * 30 +
      scores.skills * 25 +
      scores.location * 15 +
      scores.experience * 15 +
      scores.education * 10 +
      scores.employmentType * 5
    )
  );

  // Success rate: fitScore with a slight discount (operators can further filter)
  const successRate = Math.max(0, Math.round(fitScore * 0.85));

  return { fitScore, successRate, breakdown };
}

// ─── Batch Loader ─────────────────────────────────────────────────

/**
 * Load full candidate scoring data from DB.
 * @param {number} userId
 */
async function loadCandidateData(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userJobRoles: {
        where: { d_status: "active" },
        include: { jobRole: true },
      },
      skills: {
        where: { d_status: "active" },
        include: { skill: true },
      },
      addresses: { where: { d_status: "active" } },
      experiences: { where: { d_status: "active" } },
      academicQualifications: { where: { d_status: "active" } },
      itSkills: { where: { d_status: "active" } },
      otherQualifications: { where: { d_status: "active" } },
      profile: true,
    },
  });

  if (!user) return null;

  // Build synthetic address objects from user profile fields if no address records exist
  const profileAddresses = [];
  if ((user.addresses || []).length === 0) {
    if (user.city || user.country) {
      profileAddresses.push({
        city: user.city || "",
        state: "",
        country: user.country || "",
      });
    }
    if (user.profile?.closestCity) {
      profileAddresses.push({
        city: user.profile.closestCity,
        state: "",
        country: user.country || "",
      });
    }
  }

  return {
    userJobRoles: user.userJobRoles,
    userSkills: user.skills,
    addresses: user.addresses,
    experiences: user.experiences,
    academicQualifications: user.academicQualifications,
    itSkillTexts: (user.itSkills || []).map((s) => s.description),
    otherSkillTexts: (user.otherQualifications || []).map((s) => s.description),
    profileAddresses,
  };
}

/**
 * Compute fit scores for all jobs for a given candidate.
 * @param {object[]} jobs         – Array of job records
 * @param {number}   candidateId  – Logged-in candidate user ID
 * @returns {object[]}            – Jobs annotated with fitScore, successRate, breakdown
 */
async function annotateJobsWithFitScore(jobs, candidateId) {
  const candidateData = await loadCandidateData(candidateId);
  if (!candidateData) return jobs.map((j) => ({ ...j, fitScore: 0, successRate: 0, breakdown: null }));

  // Bulk-load job skills for all job IDs
  const jobIds = jobs.map((j) => j.id);
  const allJobSkills = await prisma.jobSkill.findMany({
    where: { jobId: { in: jobIds }, d_status: "active" },
    include: { skill: true },
  });

  // Group by jobId
  const skillsByJobId = {};
  allJobSkills.forEach((js) => {
    if (!skillsByJobId[js.jobId]) skillsByJobId[js.jobId] = [];
    skillsByJobId[js.jobId].push(js);
  });

  return jobs.map((job) => {
    const jobWithSkills = { ...job, skills: skillsByJobId[job.id] || [] };
    const { fitScore, successRate, breakdown } = calculateFitScore(jobWithSkills, candidateData);
    return { ...job, fitScore, successRate, breakdown };
  });
}

module.exports = {
  calculateFitScore,
  annotateJobsWithFitScore,
  loadCandidateData,
  totalExperienceMonths,
};
