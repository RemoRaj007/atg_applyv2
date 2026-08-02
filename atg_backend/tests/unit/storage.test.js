import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// config/storage.js snapshots its env into module-level constants, so each case
// has to re-evaluate the module after changing them.
const loadStorage = async () => {
  vi.resetModules();
  return import("../../config/storage.js");
};

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("isStorageConfigured", () => {
  it("is false without Supabase credentials, so uploads fall back to local disk", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { isStorageConfigured } = await loadStorage();
    expect(isStorageConfigured()).toBe(false);
  });

  it("is true once both credentials are present", async () => {
    process.env.SUPABASE_URL = "https://proj.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const { isStorageConfigured } = await loadStorage();
    expect(isStorageConfigured()).toBe(true);
  });
});

describe("uploadBuffer object keys", () => {
  let uploadBuffer;
  let fetchCalls;

  beforeEach(async () => {
    process.env.SUPABASE_URL = "https://proj.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.SUPABASE_STORAGE_BUCKET = "uploads";
    ({ uploadBuffer } = await loadStorage());

    fetchCalls = [];
    globalThis.fetch = async (url, init) => {
      fetchCalls.push({ url, init });
      return { ok: true, status: 200, text: async () => "" };
    };
  });

  const keyOf = async (originalname, folder = "photo") => {
    const { key } = await uploadBuffer({ originalname, buffer: Buffer.from("x"), mimetype: "image/png" }, folder);
    return key;
  };

  it("keeps traversal sequences out of the stored key", async () => {
    for (const name of ["../../etc/passwd", "..%2f..%2fetc/passwd", "a/../../b.png"]) {
      const key = await keyOf(name);
      expect(key).not.toContain("..");
      expect(key.split("/")).toHaveLength(2);
    }
  });

  it("keeps traversal sequences out of the folder segment", async () => {
    const key = await keyOf("photo.png", "../../secrets");
    expect(key).not.toContain("..");
    expect(key.startsWith("_")).toBe(true);
  });

  it("prefixes a UUID so two uploads of one filename cannot collide", async () => {
    const [a, b] = [await keyOf("cv.pdf"), await keyOf("cv.pdf")];
    expect(a).not.toBe(b);
    expect(a).toMatch(/^photo\/[0-9a-f-]{36}-cv\.pdf$/);
  });

  it("sends the service-role key as a bearer credential, not in the URL", async () => {
    await keyOf("cv.pdf");
    const { url, init } = fetchCalls[0];
    expect(url).not.toContain("service-role-key");
    expect(init.headers.Authorization).toBe("Bearer service-role-key");
  });

  it("surfaces a storage failure as an error rather than a silent success", async () => {
    globalThis.fetch = async () => ({ ok: false, status: 413, text: async () => "Payload too large" });
    await expect(
      uploadBuffer({ originalname: "cv.pdf", buffer: Buffer.from("x"), mimetype: "application/pdf" }, "file")
    ).rejects.toThrow(/413/);
  });
});

describe("upload middleware", () => {
  it("rejects a file type the app never legitimately stores", async () => {
    const { fileFilter } = await import("../../middlewares/upload.middleware.js");
    const reject = (mimetype, originalname) =>
      new Promise((resolve) => fileFilter({}, { mimetype, originalname }, (err, accepted) => resolve({ err, accepted })));

    for (const [mimetype, name] of [
      ["text/html", "payload.html"],
      ["image/svg+xml", "payload.svg"],
      ["application/x-msdownload", "payload.exe"],
    ]) {
      const { err, accepted } = await reject(mimetype, name);
      expect(err ?? accepted).not.toBe(true);
    }
  });

  it("accepts the document and image types the flows actually use", async () => {
    const { fileFilter } = await import("../../middlewares/upload.middleware.js");
    const accept = (mimetype, originalname) =>
      new Promise((resolve) => fileFilter({}, { mimetype, originalname }, (err, accepted) => resolve({ err, accepted })));

    for (const [mimetype, name] of [
      ["image/png", "photo.png"],
      ["image/jpeg", "photo.jpg"],
      ["application/pdf", "cv.pdf"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "cv.docx"],
    ]) {
      const { err, accepted } = await accept(mimetype, name);
      expect(err).toBeNull();
      expect(accepted).toBe(true);
    }
  });
});
