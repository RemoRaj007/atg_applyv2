const axios = require("axios");

// Mock Apify integration for Resume to Job Matching
// In production, this would call an Apify Actor with the provided resume text and job description
const matchResumeToJob = async (resumeText, jobDescription) => {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    console.warn("No APIFY_API_KEY found, using local fallback matching.");
    return fallbackMatch(resumeText, jobDescription);
  }

  // MOCK: Simulate an API call to Apify Actor
  // Normally you would do:
  // const response = await axios.post(`https://api.apify.com/v2/acts/ACTOR_ID/runs?token=${apiKey}`, { resumeText, jobDescription });
  // const result = await axios.get(`https://api.apify.com/v2/datasets/${response.data.data.defaultDatasetId}/items?token=${apiKey}`);
  
  // Here we simulate the Apify response logic
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fallbackMatch(resumeText, jobDescription));
    }, 1000); // simulate 1s processing time
  });
};

const fallbackMatch = (userText = "", jobText = "") => {
  if (!userText || !jobText) return { fitScore: 0, successRate: 0, reason: "Missing information for matching." };

  // Advanced Mock Logic
  const uWords = new Set(userText.toLowerCase().match(/\b\w{3,}\b/g) || []);
  const jWords = new Set(jobText.toLowerCase().match(/\b\w{3,}\b/g) || []);
  
  if (jWords.size === 0) return { fitScore: 0, successRate: 0, reason: "No words found in job description." };

  let matchCount = 0;
  jWords.forEach(word => {
    if (uWords.has(word)) matchCount++;
  });

  const rawFitScore = (matchCount / jWords.size) * 100;
  const fitScore = Math.min(100, Math.round(rawFitScore));

  // Success rate is usually lower than fit score, representing historical success probability
  // This could involve more complex logic, but for now we derive it from fitScore
  const successRate = Math.max(0, fitScore - (Math.random() * 20)); 

  let reason = "Good match based on keyword overlap.";
  if (fitScore < 40) reason = "Low match. Missing key skills and experience required for the role.";
  else if (fitScore > 80) reason = "Excellent match! Candidate possesses almost all required skills.";

  return { 
    fitScore, 
    successRate: Math.round(successRate * 10) / 10, // 1 decimal place 
    reason 
  };
};

module.exports = {
  matchResumeToJob,
};
