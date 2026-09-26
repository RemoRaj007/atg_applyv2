// Every automated job source. Adding one is a new adapter file exporting
// { name, label, isConfigured, fetchPostings } and a line here.
module.exports = [require("./adzuna"), require("./arbeitnow"), require("./jooble")];
