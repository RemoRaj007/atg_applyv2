const ApiError = require("../../utils/ApiError");

// Every controller reads ids with Number(req.params.id). A non-numeric segment
// became NaN and was handed to Prisma, which rejects it as an invalid argument —
// surfacing as a 500 with a driver message instead of a 400. This validates the
// segment up front so a bad id never reaches the database layer.
const numericParam = (...names) => (req, res, next) => {
  for (const name of names) {
    const raw = req.params[name];
    if (raw === undefined) continue;
    if (!/^\d+$/.test(String(raw))) {
      return next(ApiError.badRequest(`Invalid ${name}: expected a numeric id`));
    }
  }
  return next();
};

module.exports = numericParam;
