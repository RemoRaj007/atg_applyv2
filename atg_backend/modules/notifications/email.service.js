const nodemailer = require("nodemailer");
const { systemLogger } = require("../../config/atg_logger");

let transporter = null;

// Lazily built so a missing/incomplete SMTP config doesn't crash the app at require-time —
// it only matters the moment something actually tries to send an email.
const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, body }) => {
  const mailer = getTransporter();
  if (!mailer) {
    systemLogger.warn("Email not sent: EMAIL_HOST is not configured", { to, subject });
    return false;
  }

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      // Belt and braces: a stray newline in a subject is a header-injection
      // primitive, and subjects now come from an admin-editable template.
      subject: String(subject ?? "").replace(/[\r\n]+/g, " "),
      text: body,
    });
    systemLogger.info("Email sent", { to, subject });
    return true;
  } catch (err) {
    systemLogger.error("Failed to send email", { to, subject, error: err.message });
    return false;
  }
};

// Replaces {{placeholder}} with the matching value. Only keys present in `vars`
// are substituted, and each replacement is inserted literally — a value that
// itself contains "{{...}}" cannot trigger a second round of substitution.
const render = (template, vars = {}) =>
  String(template ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? "") : match
  );

// Sends using the admin-editable template stored under `key`, falling back to
// the caller's literal subject/body when the template is missing or switched
// off. The fallback matters: mail has to keep flowing if the content tables
// have not been seeded yet, or an admin deactivates a template by mistake.
const sendTemplatedEmail = async ({ to, templateKey, vars = {}, fallback }) => {
  let template = null;

  try {
    // Required lazily: content.service pulls in the Prisma client, and this
    // module is itself required by services that content.service uses.
    const contentService = require("../content/content.service");
    template = await contentService.getTemplate(templateKey);
  } catch (err) {
    systemLogger.warn("Falling back to the built-in email copy", { templateKey, error: err.message });
  }

  const siteName = vars.siteName || process.env.SITE_NAME || "ATG Apply";
  const merged = { ...vars, siteName };

  const subject = template ? render(template.subject, merged) : fallback?.subject;
  const body = template ? render(template.body, merged) : fallback?.body;

  if (!subject || !body) {
    systemLogger.warn("Email not sent: no template and no fallback copy", { templateKey, to });
    return false;
  }

  return sendEmail({ to, subject, body });
};

module.exports = { sendEmail, sendTemplatedEmail, render };
