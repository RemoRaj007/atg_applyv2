// Public URL for an uploaded file, independent of storage mode.
//
// With Supabase Storage the upload middleware sets an absolute `url`. On local
// disk there's no `url`, so fall back to the path served by the /uploads static
// mount in app.js. Existing rows created before the storage migration hold that
// same relative form, so both keep resolving.
const fileUrl = (file) => {
  if (!file) return null;
  if (file.url) return file.url;
  return file.filename ? `/uploads/${file.filename}` : null;
};

module.exports = fileUrl;
