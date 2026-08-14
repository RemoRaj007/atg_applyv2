const { prisma } = require("../../config/db");
const { systemLogger } = require("../../config/atg_logger");
const axios = require("axios");

/**
 * Dynamically extract search profile bounds from a candidate's actual registered DB profile
 */
const buildProfileDataFromUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userJobRoles: {
        include: { jobRole: true }
      },
      skills: {
        include: { skill: true }
      },
      experiences: true
    }
  });

  if (!user) return null;

  // Extract roles
  const roles = user.userJobRoles.map(ujr => ujr.jobRole.name);
  const targetRole = roles.length > 0 ? roles.join(", ") : "Software Engineer";

  // Extract skills
  const skillsList = user.skills.map(us => us.skill.name);
  const skillsKeywords = skillsList.length > 0 ? skillsList.join(", ") : "JavaScript, React, Node.js";

  // Calculate experience years from their listed experiences
  let experienceYears = 0;
  if (user.experiences && user.experiences.length > 0) {
    let totalMonths = 0;
    user.experiences.forEach(exp => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      totalMonths += diffMonths;
    });
    experienceYears = Math.max(1, Math.round(totalMonths / 12));
  } else {
    experienceYears = 2; // default fallback
  }

  return {
    userId,
    industry: "Technology",
    targetRole,
    remotePreference: "remote",
    salaryMin: 50000,
    salaryMax: 120000,
    skillsKeywords,
    experienceYears
  };
};

/**
 * Get or create the Anonymous Discovery Profile for a candidate
 */
const getOrCreateProfile = async (userId) => {
  let profile = await prisma.anonymousDiscoveryProfile.findUnique({
    where: { userId },
    include: { operators: true }
  });

  if (!profile) {
    const profileData = await buildProfileDataFromUser(userId);
    if (!profileData) {
      throw new Error(`User with ID ${userId} not found`);
    }

    profile = await prisma.anonymousDiscoveryProfile.create({
      data: profileData,
      include: { operators: true }
    });

    // Create a default Operator too
    await prisma.aIOperator.create({
      data: {
        profileId: profile.id,
        name: "Default Market Scraper",
        isActive: true,
        runFrequency: "daily"
      }
    });

    // Refresh profile to include operator
    profile = await prisma.anonymousDiscoveryProfile.findUnique({
      where: { userId },
      include: { operators: true }
    });
  }

  return profile;
};

/**
 * Update the profile
 */
const updateProfile = async (userId, data) => {
  const profile = await getOrCreateProfile(userId);
  return await prisma.anonymousDiscoveryProfile.update({
    where: { id: profile.id },
    data: {
      industry: data.industry,
      targetRole: data.targetRole,
      remotePreference: data.remotePreference,
      salaryMin: data.salaryMin ? parseFloat(data.salaryMin) : null,
      salaryMax: data.salaryMax ? parseFloat(data.salaryMax) : null,
      skillsKeywords: data.skillsKeywords,
      experienceYears: data.experienceYears ? parseInt(data.experienceYears, 10) : null
    }
  });
};

/**
 * Get active Operators for a candidate profile
 */
const getOperators = async (profileId) => {
  return await prisma.aIOperator.findMany({
    where: { profileId, d_status: "active" }
  });
};

/**
 * Create or Toggle AI Operator
 */
const toggleOperator = async (profileId, operatorId, isActive) => {
  return await prisma.aIOperator.update({
    where: { id: operatorId, profileId },
    data: { isActive }
  });
};

/**
 * Create a new operator
 */
const createOperator = async (profileId, data) => {
  return await prisma.aIOperator.create({
    data: {
      profileId,
      name: data.name || "Custom AI Search Agent",
      isActive: data.isActive !== undefined ? data.isActive : true,
      runFrequency: data.runFrequency || "daily"
    }
  });
};

/**
 * Delete operator (soft delete)
 */
const deleteOperator = async (profileId, operatorId) => {
  return await prisma.aIOperator.update({
    where: { id: operatorId, profileId },
    data: { d_status: "deleted", isActive: false }
  });
};

/**
 * Get Job Matches for a profile
 */
const getMatches = async (profileId) => {
  return await prisma.anonymousJobMatch.findMany({
    where: { profileId, d_status: "active" },
    orderBy: { fitScore: "desc" }
  });
};

/**
 * Update match status (e.g. bookmarking or ignoring)
 */
const updateMatchStatus = async (profileId, matchId, status) => {
  return await prisma.anonymousJobMatch.update({
    where: { id: matchId, profileId },
    data: { status }
  });
};

/**
 * Run Anonymous Job Discovery (Apify integration & scoring)
 */
const runJobDiscovery = async (profileId) => {
  const profile = await prisma.anonymousDiscoveryProfile.findUnique({
    where: { id: profileId },
    include: { operators: true }
  });

  if (!profile) {
    throw new Error("Discovery profile not found");
  }

  // Define some candidate search properties (completely anonymized, no name/resume)
  const targetRole = profile.targetRole || "Software Engineer";
  const industry = profile.industry || "Technology";
  const keywords = (profile.skillsKeywords || "").split(",").map(k => k.trim()).filter(Boolean);
  const remotePref = profile.remotePreference || "any";
  const expYears = profile.experienceYears || 0;

  systemLogger.info(`Running AI Job Discovery Operator for profile ID ${profileId}. Target: ${targetRole}, Industry: ${industry}`);

  // Fetch jobs using Apify or fallback
  let marketJobs = [];
  let marketSearchUnavailable = false;
  let apiKey = process.env.APIFY_API_KEY;
  if (apiKey) {
    apiKey = apiKey.replace(/^["']|["']$/g, "").trim();
  }

  if (apiKey && !apiKey.startsWith("apify_api_mock") && apiKey !== "mock" && apiKey !== "") {
    try {
      // In production, trigger an Apify Google Jobs or Indeed Scraper Actor.
      const actorId = "johnvc~google-jobs-scraper";
      const query = `${targetRole} ${profile.remotePreference === "remote" ? "Remote" : ""}`.trim();

      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}`,
        {
          query: query,
          maxItems: 10,
          endPage: 1
        },
        {
          timeout: 180000 // 3 minutes timeout to wait for scraper completion
        }
      );

      const items = Array.isArray(runResponse.data) ? runResponse.data : [];
      systemLogger.info(`Apify response status: ${runResponse.status}. Received ${items.length} raw items from dataset.`);
      systemLogger.info(`Apify full response data: ${JSON.stringify(runResponse.data)}`);
      if (items.length > 0) {
        systemLogger.info(`Sample raw item keys: ${Object.keys(items[0]).join(", ")}`);
      }

      marketJobs = items.map(item => ({
        title: item.title || item.positionName || "",
        company: item.company_name || item.companyName || item.company || "Confidential",
        location: item.location || "Remote / USA",
        description: item.description || item.jobDescription || "",
        url: item.url || item.URL || item.jobUrl || ""
      }));
    } catch (err) {
      const errorDetail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
      if (mockDiscoveryAllowed()) {
        systemLogger.warn("Apify direct API call failed or timed out. Falling back to simulated market search.", { error: errorDetail });
        marketJobs = getSimulatedMarketJobs(targetRole, industry);
      } else {
        systemLogger.error("Apify direct API call failed or timed out; returning no matches.", { error: errorDetail });
        marketSearchUnavailable = true;
      }
    }
  } else if (mockDiscoveryAllowed()) {
    // Simulated market database for demo/mock Apify integration
    systemLogger.warn("APIFY_API_KEY absent or mock; serving simulated market jobs (ALLOW_MOCK_JOB_DISCOVERY is on).");
    marketJobs = getSimulatedMarketJobs(targetRole, industry);
  } else {
    systemLogger.error("APIFY_API_KEY absent or mock and ALLOW_MOCK_JOB_DISCOVERY is off; returning no matches.");
    marketSearchUnavailable = true;
  }

  // Nothing was searched, so there is nothing to reconcile — leave the existing
  // matches alone rather than deleting them in favour of an empty result.
  if (marketSearchUnavailable) {
    return { matches: [], marketSearchUnavailable: true };
  }

  // Clean old matches before creating new ones, or keep old ones that were bookmarked/applied
  await prisma.anonymousJobMatch.deleteMany({
    where: {
      profileId,
      status: "new"
    }
  });

  const createdMatches = [];

  // Calculate fit scores for each job and save
  for (const job of marketJobs) {
    const { fitScore, fitReason } = evaluateJobFit(job, profile, keywords);

    const newMatch = await prisma.anonymousJobMatch.create({
      data: {
        profileId,
        jobTitle: job.title,
        companyName: job.company,
        location: job.location,
        jobUrl: job.url,
        description: job.description,
        fitScore,
        fitReason,
        status: "new"
      }
    });
    createdMatches.push(newMatch);
  }

  // Update operator last run times
  await prisma.aIOperator.updateMany({
    where: { profileId },
    data: { lastRunAt: new Date() }
  });

  return { matches: createdMatches, marketSearchUnavailable: false };
};

/**
 * Whether the simulated market database may stand in for a real Apify search.
 *
 * These jobs are invented — they point at https://mock-market-jobs.atgapply.com
 * and the UI links them as real listings, so a candidate can "apply" to a job
 * that does not exist. Serving them used to be the automatic fallback whenever
 * the key was missing or the call timed out, which meant a production deploy
 * with an unset key quietly handed out fiction. It now takes an explicit opt-in
 * that must never be set in production.
 */
const mockDiscoveryAllowed = () =>
  String(process.env.ALLOW_MOCK_JOB_DISCOVERY || "").toLowerCase() === "true";

/**
 * Generate simulated market jobs based on role & industry
 */
const getSimulatedMarketJobs = (role, industry) => {
  const roles = [
    { title: `Senior ${role}`, company: "Quantum Leap Technologies", location: "San Francisco, CA (Hybrid)", description: "Looking for an expert to design next-gen systems. Required experience: 5+ years. Core stack: Node.js, React, and cloud native architectures." },
    { title: `${role}`, company: "Nova Digital Solutions", location: "Austin, TX (Remote)", description: `Join our team to build scalable services. Ideal candidate has experience in ${role} methodologies. Skills: JavaScript, React, SQL, and Git.` },
    { title: `Associate ${role}`, company: "FuturePath Enterprises", location: "New York, NY (Onsite)", description: "Great opportunity for juniors or mid-level specialists. Under supervision, you will build widgets, refine APIs, and support QA pipelines." },
    { title: `Lead ${role}`, company: "Apex Systems Labs", location: "Remote", description: "Lead a growing squad of remote developers. Focus on web products, performance optimization, and architectural scaling." },
    { title: `Staff ${role}`, company: "Stellar Horizon Ltd", location: "Chicago, IL (Hybrid)", description: "High autonomy role shaping our tech infrastructure. Solid grasp of DevOps, modern engineering practices, and automated testing required." }
  ];
  return roles.map((r, i) => ({
    title: r.title,
    company: r.company,
    location: r.location,
    description: r.description,
    url: `https://mock-market-jobs.atgapply.com/job/${i + 100}`
  }));
};

/**
 * Match evaluation algorithm without sharing personal data
 */
const evaluateJobFit = (job, profile, keywords) => {
  let score = 50; // base score
  const reasons = [];

  // 1. Role match
  const jobTitleLower = (job.title || job.jobTitle || "").toLowerCase();
  const targetRoleLower = (profile.targetRole || "").toLowerCase();
  if (jobTitleLower.includes(targetRoleLower)) {
    score += 15;
    reasons.push("Job title aligns closely with your target role.");
  } else {
    score -= 10;
    reasons.push("Job title deviates from target role.");
  }

  // 2. Remote preference
  const isJobRemote = (job.location || "").toLowerCase().includes("remote");
  const isJobHybrid = (job.location || "").toLowerCase().includes("hybrid");
  const isJobOnsite = (job.location || "").toLowerCase().includes("onsite") || (!isJobRemote && !isJobHybrid);

  if (profile.remotePreference === "remote" && isJobRemote) {
    score += 15;
    reasons.push("Perfect match for remote work preference.");
  } else if (profile.remotePreference === "hybrid" && isJobHybrid) {
    score += 15;
    reasons.push("Perfect match for hybrid work preference.");
  } else if (profile.remotePreference === "onsite" && isJobOnsite) {
    score += 15;
    reasons.push("Perfect match for onsite work preference.");
  } else if (profile.remotePreference !== "any") {
    score -= 15;
    reasons.push(`Job setup (${isJobRemote ? 'Remote' : isJobHybrid ? 'Hybrid' : 'Onsite'}) doesn't match preferred format.`);
  }

  // 3. Keywords / Tech stack match
  if (keywords.length > 0) {
    let matchCount = 0;
    const descLower = (job.description || "").toLowerCase();
    keywords.forEach(kw => {
      if (descLower.includes(kw.toLowerCase())) {
        matchCount++;
      }
    });

    const matchRatio = matchCount / keywords.length;
    const kwScore = Math.round(matchRatio * 25);
    score += kwScore;
    if (matchCount > 0) {
      reasons.push(`Matched key tech stack/skills: ${keywords.filter(kw => descLower.includes(kw.toLowerCase())).join(", ")}.`);
    } else {
      score -= 10;
      reasons.push("No specific keyword overlap found in the description.");
    }
  }

  // Clean score bounds
  score = Math.max(10, Math.min(100, score));

  return {
    fitScore: score,
    fitReason: reasons.join(" ")
  };
};

const getAllProfiles = async () => {
  // Find all active candidates in the database
  const candidates = await prisma.user.findMany({
    where: { role: "candidate", d_status: "active" }
  });

  // Automatically initialize/retrieve profiles for candidates to sync with real DB user records
  for (const candidate of candidates) {
    try {
      await getOrCreateProfile(candidate.id);
    } catch (err) {
      systemLogger.warn(`Could not initialize anonymous discovery profile for candidate ID ${candidate.id}`, { error: err.message });
    }
  }

  return await prisma.anonymousDiscoveryProfile.findMany({
    where: { d_status: "active" },
    include: {
      user: {
        select: { id: true, email: true, name: true }
      },
      operators: true,
      matches: true
    }
  });
};

module.exports = {
  getOrCreateProfile,
  updateProfile,
  getOperators,
  toggleOperator,
  createOperator,
  deleteOperator,
  getMatches,
  updateMatchStatus,
  runJobDiscovery,
  getAllProfiles
};
