const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isStorageConfigured, uploadBuffer } = require("../config/storage");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Two storage modes:
//  - Supabase Storage (production): files are buffered in memory then streamed to
//    the bucket. Vercel's filesystem is read-only outside /tmp and is discarded
//    between invocations, so writing uploads to local disk there fails outright.
//  - Local disk (development, when the Supabase credentials aren't set), which
//    keeps `npm run dev` working without any cloud setup.
const useRemoteStorage = isStorageConfigured();

const buildLocalStorage = () => {
  const uploadDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
};

const multerInstance = multer({
  storage: useRemoteStorage ? multer.memoryStorage() : buildLocalStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Runs after multer and replaces each in-memory buffer with a stored object,
// setting `file.url`. Read it via utils/fileUrl so callers stay agnostic about
// which storage mode is active.
const persistToRemoteStorage = async (req, res, next) => {
  if (!useRemoteStorage) return next();

  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files) Object.values(req.files).flat().forEach((f) => files.push(f));

  if (files.length === 0) return next();

  try {
    await Promise.all(
      files.map(async (file) => {
        const { key, url } = await uploadBuffer(file, file.fieldname);
        file.url = url;
        file.key = key;
        // Free the buffer once uploaded; these can be large and the request
        // object outlives this middleware.
        delete file.buffer;
      })
    );
    next();
  } catch (err) {
    next(err);
  }
};

// Mirrors multer's API but appends the persist step, so route definitions such as
// `upload.single("photo")` need no changes. Express flattens nested middleware
// arrays, so returning an array here is transparent to the router.
const upload = {
  single: (field) => [multerInstance.single(field), persistToRemoteStorage],
  array: (field, maxCount) => [multerInstance.array(field, maxCount), persistToRemoteStorage],
  fields: (fields) => [multerInstance.fields(fields), persistToRemoteStorage],
  none: () => [multerInstance.none()],
  any: () => [multerInstance.any(), persistToRemoteStorage],
};

module.exports = upload;
