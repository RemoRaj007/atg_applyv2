const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger, systemLogger } = require("../../config/atg_logger");
const { SETTINGS, CONTENT, EMAIL_TEMPLATES } = require("./content.defaults");

// ─── Settings ────────────────────────────────────────────────────────────────

const listSettings = async ({ group } = {}) => {
  const where = { d_status: "active", ...(group ? { group } : {}) };
  return prisma.siteSetting.findMany({ where, orderBy: [{ group: "asc" }, { sortOrder: "asc" }] });
};

// The unauthenticated view. Only rows explicitly flagged public are included —
// operational settings (quotas, tuning) must not leak to the marketing site.
const publicSettings = async () => {
  const rows = await prisma.siteSetting.findMany({
    where: { d_status: "active", isPublic: true },
    select: { key: true, value: true, valueType: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, coerce(r.value, r.valueType)]));
};

// Values are stored as text because the column is shared across types; this
// hands the client the shape the type promises rather than a string every time.
const coerce = (value, valueType) => {
  if (valueType === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (valueType === "boolean") return value === "true";
  return value;
};

const updateSetting = async (key, value, requester) => {
  const setting = await prisma.siteSetting.findFirst({ where: { key, d_status: "active" } });
  if (!setting) throw ApiError.notFound("Setting not found");

  const normalized = normalizeForType(String(value ?? ""), setting.valueType, setting.label);

  const updated = await prisma.siteSetting.update({ where: { key }, data: { value: normalized } });
  activityLogger.activity("Site setting updated", { key, updatedBy: requester?.id });
  return updated;
};

// Bulk save, which is how the admin form submits — one round trip for a group.
const updateSettings = async (entries, requester) => {
  const updated = [];
  for (const { key, value } of entries) {
    updated.push(await updateSetting(key, value, requester));
  }
  return updated;
};

const normalizeForType = (value, valueType, label) => {
  const trimmed = value.trim();

  if (valueType === "number") {
    if (trimmed !== "" && !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw ApiError.badRequest(`${label} must be a number`);
    }
    return trimmed;
  }

  if (valueType === "boolean") {
    if (!["true", "false", ""].includes(trimmed)) {
      throw ApiError.badRequest(`${label} must be true or false`);
    }
    return trimmed === "true" ? "true" : "false";
  }

  if (valueType === "url" && trimmed !== "") {
    // Anything that is not http(s) — javascript:, data: — would become a live
    // link in the site footer, so it is refused rather than stored.
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      throw ApiError.badRequest(`${label} must be an http(s) URL`);
    }
  }

  if (valueType === "email" && trimmed !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    throw ApiError.badRequest(`${label} must be an email address`);
  }

  if (valueType === "color" && trimmed !== "" && !/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    throw ApiError.badRequest(`${label} must be a hex colour such as #2563eb`);
  }

  return trimmed;
};

// ─── Content blocks ──────────────────────────────────────────────────────────

const listContent = async ({ page } = {}) => {
  const where = { d_status: "active", ...(page ? { page } : {}) };
  return prisma.contentBlock.findMany({ where, orderBy: [{ page: "asc" }, { sortOrder: "asc" }] });
};

// What the public pages fetch: a flat key → value map for one page.
const publicContent = async (page) => {
  const blocks = await prisma.contentBlock.findMany({
    where: { page, d_status: "active" },
    select: { key: true, value: true, valueType: true },
    orderBy: { sortOrder: "asc" },
  });
  return Object.fromEntries(blocks.map((b) => [b.key, b.value]));
};

const updateContent = async (id, data, requester) => {
  const block = await prisma.contentBlock.findFirst({ where: { id, d_status: "active" } });
  if (!block) throw ApiError.notFound("Content block not found");

  const updated = await prisma.contentBlock.update({
    where: { id },
    data: { value: String(data.value ?? "") },
  });
  activityLogger.activity("Content block updated", { page: block.page, key: block.key, updatedBy: requester?.id });
  return updated;
};

const updateContentBlocks = async (entries, requester) => {
  const updated = [];
  for (const { id, value } of entries) {
    updated.push(await updateContent(Number(id), { value }, requester));
  }
  return updated;
};

// Restores one page's copy to what the code ships, for when an edit goes wrong.
const resetContentPage = async (page, requester) => {
  const defaults = CONTENT.filter((c) => c.page === page);
  if (defaults.length === 0) throw ApiError.notFound("Unknown content page");

  for (const block of defaults) {
    await prisma.contentBlock.updateMany({
      where: { page: block.page, key: block.key },
      data: { value: block.value },
    });
  }
  activityLogger.activity("Content page reset to defaults", { page, resetBy: requester?.id });
  return listContent({ page });
};

// ─── Email templates ─────────────────────────────────────────────────────────

const listTemplates = async () =>
  prisma.emailTemplate.findMany({ where: { d_status: "active" }, orderBy: { name: "asc" } });

const getTemplate = async (key) =>
  prisma.emailTemplate.findFirst({ where: { key, d_status: "active", isActive: true } });

const updateTemplate = async (id, data, requester) => {
  const template = await prisma.emailTemplate.findFirst({ where: { id, d_status: "active" } });
  if (!template) throw ApiError.notFound("Email template not found");

  const allowed = parseVariables(template.variables);
  const patch = {};

  if (data.subject !== undefined) {
    // A newline in a subject line is a header-injection primitive, so it is
    // stripped rather than trusted to the mail library.
    patch.subject = String(data.subject).replace(/[\r\n]+/g, " ").trim();
    assertKnownPlaceholders(patch.subject, allowed, "Subject");
  }

  if (data.body !== undefined) {
    patch.body = String(data.body);
    assertKnownPlaceholders(patch.body, allowed, "Body");
  }

  if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);

  const updated = await prisma.emailTemplate.update({ where: { id }, data: patch });
  activityLogger.activity("Email template updated", { key: template.key, updatedBy: requester?.id });
  return updated;
};

const parseVariables = (raw) => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// A placeholder the renderer does not know would be delivered to the recipient
// verbatim ("Hi {{frist_name}}"), so an unknown one is rejected at save time
// where the admin can still fix it.
const assertKnownPlaceholders = (text, allowed, field) => {
  const used = [...String(text).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
  const unknown = [...new Set(used)].filter((name) => !allowed.includes(name));
  if (unknown.length > 0) {
    throw ApiError.badRequest(
      `${field} uses unknown placeholders: ${unknown.map((u) => `{{${u}}}`).join(", ")}. Available: ${allowed
        .map((a) => `{{${a}}}`)
        .join(", ")}`
    );
  }
};

const resetTemplate = async (id, requester) => {
  const template = await prisma.emailTemplate.findFirst({ where: { id, d_status: "active" } });
  if (!template) throw ApiError.notFound("Email template not found");

  const shipped = EMAIL_TEMPLATES.find((t) => t.key === template.key);
  if (!shipped) throw ApiError.badRequest("This template has no shipped default to restore");

  const updated = await prisma.emailTemplate.update({
    where: { id },
    data: { subject: shipped.subject, body: shipped.body },
  });
  activityLogger.activity("Email template reset to default", { key: template.key, resetBy: requester?.id });
  return updated;
};

// ─── Seeding ─────────────────────────────────────────────────────────────────

// Inserts any default that is not in the database yet, leaving existing rows —
// and therefore any admin edit — untouched. Safe to run on every boot.
const seedDefaults = async () => {
  let inserted = 0;

  for (const s of SETTINGS) {
    const created = await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: s.value,
        valueType: s.valueType || "text",
        group: s.group || "general",
        label: s.label,
        description: s.description || null,
        isPublic: Boolean(s.isPublic),
        sortOrder: s.sortOrder || 0,
      },
    });
    if (created) inserted += 1;
  }

  for (const c of CONTENT) {
    await prisma.contentBlock.upsert({
      where: { page_key: { page: c.page, key: c.key } },
      update: {},
      create: {
        page: c.page,
        key: c.key,
        value: c.value,
        valueType: c.valueType || "text",
        label: c.label,
        helpText: c.helpText || null,
        sortOrder: c.sortOrder || 0,
      },
    });
  }

  for (const t of EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: { variables: JSON.stringify(t.variables) }, // keep the allow-list current
      create: {
        key: t.key,
        name: t.name,
        subject: t.subject,
        body: t.body,
        description: t.description || null,
        variables: JSON.stringify(t.variables),
      },
    });
  }

  systemLogger.info("Content defaults seeded", { settings: SETTINGS.length, content: CONTENT.length, templates: EMAIL_TEMPLATES.length });
  return { inserted };
};

module.exports = {
  listSettings,
  publicSettings,
  updateSetting,
  updateSettings,
  listContent,
  publicContent,
  updateContent,
  updateContentBlocks,
  resetContentPage,
  listTemplates,
  getTemplate,
  updateTemplate,
  resetTemplate,
  seedDefaults,
  coerce,
};
