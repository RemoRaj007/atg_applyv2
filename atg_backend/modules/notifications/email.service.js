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
      subject,
      text: body,
    });
    systemLogger.info("Email sent", { to, subject });
    return true;
  } catch (err) {
    systemLogger.error("Failed to send email", { to, subject, error: err.message });
    return false;
  }
};

module.exports = { sendEmail };
