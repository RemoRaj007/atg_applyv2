const Joi = require("joi");

// Catalogue field codes: "SYS-01", "EDU1-03", "PROJ-X02", "EXP-X01".
const FIELD_CODE = /^[A-Z]+\d*-[A-Z]?\d+$/;

// Validation runs on the server as well as the client. The client copy is for
// telling the candidate what is wrong next to the field; this copy is the one
// that actually decides what gets stored, because a browser can be bypassed.
const patchFieldsSchema = Joi.object({
  updates: Joi.array()
    .min(1)
    .max(50)
    .items(
      Joi.object({
        code: Joi.string().pattern(FIELD_CODE).required().messages({
          "string.pattern.base": "Field code must look like SYS-01 or EDU1-03.",
        }),
        // 0 for ordinary fields; the entry number for a repeatable group.
        repeatIndex: Joi.number().integer().min(0).max(99).default(0),
        // Generous but bounded: the catalogue's paragraph questions invite long
        // answers (a 250-word biography, a full employment history), and the
        // column is TEXT, but an unbounded body is a free memory-exhaustion
        // vector. The Express json limit (256kb) is the outer bound.
        value: Joi.string().allow("", null).max(20000).required(),
      })
    )
    .required(),
}).required();

const reviewSchema = Joi.object({
  // Free-text note listing facts the candidate is unsure about, per chapter 19.
  notes: Joi.string().allow("", null).max(5000),
}).required();

// An operator asks the candidate to correct a value; they never edit it.
const correctionSchema = Joi.object({
  code: Joi.string().pattern(FIELD_CODE).required(),
  reason: Joi.string().min(3).max(1000).required(),
}).required();

const noteSchema = Joi.object({
  fieldCode: Joi.string().pattern(FIELD_CODE).allow(null, ""),
  body: Joi.string().min(1).max(5000).required(),
}).required();

module.exports = { patchFieldsSchema, reviewSchema, correctionSchema, noteSchema, FIELD_CODE };
