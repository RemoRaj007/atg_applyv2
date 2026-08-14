const crypto = require("crypto");
const path = require("path");

// Supabase Storage over its REST API. Deliberately dependency-free (Node's global
// fetch) rather than pulling in @supabase/supabase-js, to keep the serverless
// bundle small.
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

// When the storage credentials are absent (typical for local development) callers
// fall back to multer's disk storage, so uploads keep working off the local disk.
const isStorageConfigured = () => Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

// One folder segment, one file segment, and nothing else — no slashes beyond the
// separator, no dot segments, no percent-encoding, no query or fragment.
const SAFE_OBJECT_KEY = /^[a-zA-Z0-9_-]{1,64}\/[a-zA-Z0-9._-]{1,160}$/;

// Keep the original name recognisable in the object key but strip anything that
// could alter the storage path, then prefix a UUID so concurrent uploads of the
// same filename can't collide.
const buildObjectKey = (file, folder) => {
  const ext = path.extname(file.originalname || "").slice(0, 20);
  const base = path
    .basename(file.originalname || "file", ext)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 60);
  // Folders come from the multer field name (photo, file, slip, proof), so dots
  // are never needed — excluding them keeps ".." out of the key entirely.
  const safeFolder = String(folder || "misc").replace(/[^a-zA-Z0-9_-]/g, "_") || "misc";
  const key = `${safeFolder}/${crypto.randomUUID()}-${base}${ext}`;

  // The key goes into the request URL below, so the sanitising above is not
  // merely cosmetic — it decides which path this API asks Supabase to write to
  // (js/request-forgery). Rather than trusting the three replaces to have
  // covered everything, assert the finished key against the only shape a key is
  // ever allowed to take. A value that fails this cannot reach the URL at all.
  if (!SAFE_OBJECT_KEY.test(key)) {
    throw new Error("Refusing to build a storage object key from this filename");
  }
  return key;
};

const publicUrlFor = (key) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURI(key)}`;

// Uploads a multer memoryStorage file and resolves to its public URL.
const uploadBuffer = async (file, folder) => {
  if (!isStorageConfigured()) {
    throw new Error("Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }

  const key = buildObjectKey(file, folder);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": file.mimetype || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
    body: file.buffer,
  });

  if (!response.ok) {
    // Include the storage response body — it names the actual cause (missing
    // bucket, size limit, bad key) which a bare status code hides.
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${response.status}): ${detail}`);
  }

  return { key, url: publicUrlFor(key) };
};

// buildObjectKey is exported for the tests that assert what can and cannot reach
// the storage request URL — the sanitising it does is security-relevant, so it
// is worth testing directly rather than only through an upload.
module.exports = { isStorageConfigured, uploadBuffer, publicUrlFor, buildObjectKey, BUCKET };
