const Joi = require("joi");

// Job links are rendered as clickable anchors in the operator queue. Joi's
// .uri() accepts any scheme, so an unrestricted rule let a candidate submit
// `javascript:...` and have an operator's click execute it. Pin the schemes.
const httpUrl = () => Joi.string().uri({ scheme: ["http", "https"] });

const createApplicationSchema = Joi.object({
  userId: Joi.number().integer().optional(),
  jobId: Joi.number().integer().optional(),
  scholarshipId: Joi.number().integer().optional(),
  fitScore: Joi.number().min(0).max(100).allow(null),
  reason: Joi.string().max(1000).allow(null, ""),
  comment: Joi.string().max(1000).allow(null, ""),
  jobLinkRequest: httpUrl().max(2000).allow(null, ""),
}).or("jobId", "scholarshipId", "jobLinkRequest");

const linkRequestSchema = Joi.object({
  jobLinkRequest: httpUrl().max(2000).required(),
  comment: Joi.string().max(1000).allow(null, ""),
});

const fitReviewSchema = Joi.object({
  fitScore: Joi.number().min(0).max(100).required(),
  operatorFitNote: Joi.string().max(2000).allow(null, ""),
});

const confirmApplySchema = Joi.object({
  // No body needed — identity comes from the JWT session
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    "requested",
    "link_request",
    "fit_reviewed",
    "candidate_applied",
    "processing",
    "pending_approval",
    "approved",
    "completed",
    "rejected",
    "skipped"
  ),
  internalNotes: Joi.string().max(2000).allow(null, ""),
  operatorDocNotes: Joi.string().max(5000).allow(null, ""),
  proof: Joi.string().max(500).allow(null, ""),
  proofRef: Joi.string().max(255).allow(null, ""),
}).min(1);

const approvalSchema = Joi.object({
  approved: Joi.boolean().required(),
  comment: Joi.string().max(1000).when("approved", {
    is: false,
    then: Joi.string().required().messages({
      "any.required": "Comment is required when rejecting",
      "string.empty": "Comment cannot be empty when rejecting"
    }),
    otherwise: Joi.string().allow(null, "")
  }),
});

const feedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  text: Joi.string().max(2000).required(),
});

const createCommentSchema = Joi.object({
  text: Joi.string().max(2000).required(),
  type: Joi.string().valid("public", "internal").default("public"),
});

module.exports = { 
  createApplicationSchema, 
  linkRequestSchema,
  fitReviewSchema,
  confirmApplySchema,
  updateStatusSchema, 
  approvalSchema,
  feedbackSchema,
  createCommentSchema
};
