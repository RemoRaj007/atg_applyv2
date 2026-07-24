const anonymousDiscoveryService = require("./anonymous-discovery.service");

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    res.json({ status: true, data: profile });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updated = await anonymousDiscoveryService.updateProfile(userId, req.body);
    res.json({ status: true, data: updated, message: "Discovery profile updated successfully" });
  } catch (err) {
    next(err);
  }
};

const getOperators = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const operators = await anonymousDiscoveryService.getOperators(profile.id);
    res.json({ status: true, data: operators });
  } catch (err) {
    next(err);
  }
};

const createOperator = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const operator = await anonymousDiscoveryService.createOperator(profile.id, req.body);
    res.status(201).json({ status: true, data: operator, message: "AI Operator deployed successfully" });
  } catch (err) {
    next(err);
  }
};

const toggleOperator = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const operatorId = parseInt(req.params.operatorId, 10);
    const updated = await anonymousDiscoveryService.toggleOperator(profile.id, operatorId, req.body.isActive);
    res.json({ status: true, data: updated, message: `Operator active status updated to ${req.body.isActive}` });
  } catch (err) {
    next(err);
  }
};

const deleteOperator = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const operatorId = parseInt(req.params.operatorId, 10);
    await anonymousDiscoveryService.deleteOperator(profile.id, operatorId);
    res.json({ status: true, message: "Operator deactivated and removed successfully" });
  } catch (err) {
    next(err);
  }
};

const getMatches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const matches = await anonymousDiscoveryService.getMatches(profile.id);
    res.json({ status: true, data: matches });
  } catch (err) {
    next(err);
  }
};

const updateMatchStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const matchId = parseInt(req.params.matchId, 10);
    const updated = await anonymousDiscoveryService.updateMatchStatus(profile.id, matchId, req.body.status);
    res.json({ status: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const runDiscovery = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await anonymousDiscoveryService.getOrCreateProfile(userId);
    const matches = await anonymousDiscoveryService.runJobDiscovery(profile.id);
    res.json({ status: true, data: matches, message: `Scraper executed successfully! Found ${matches.length} job matches.` });
  } catch (err) {
    next(err);
  }
};

// Admin/Operator controller methods
const adminGetAllProfiles = async (req, res, next) => {
  try {
    const profiles = await anonymousDiscoveryService.getAllProfiles();
    res.json({ status: true, data: profiles });
  } catch (err) {
    next(err);
  }
};

const adminRunDiscoveryForProfile = async (req, res, next) => {
  try {
    const profileId = parseInt(req.params.profileId, 10);
    const matches = await anonymousDiscoveryService.runJobDiscovery(profileId);
    res.json({ status: true, data: matches, message: `Operator ran discovery job for profile #${profileId}. Found ${matches.length} matches.` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getOperators,
  createOperator,
  toggleOperator,
  deleteOperator,
  getMatches,
  updateMatchStatus,
  runDiscovery,
  adminGetAllProfiles,
  adminRunDiscoveryForProfile
};
