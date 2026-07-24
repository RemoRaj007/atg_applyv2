// Vercel serverless entrypoint. Exports the Express app directly — Vercel's
// Node runtime invokes it per-request, so no app.listen() call here.
module.exports = require("../app");
